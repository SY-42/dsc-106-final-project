import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import { averageHeartRateData, restingHeartRateData, isPrediabetic} from "./scripts/utils.js";

var margin = {top: 20, right: 30, bottom: 40, left: 150},
    countryWidth = 460 - margin.left - margin.right,
    countryHeight = 400 - margin.top - margin.bottom;

const countryParser = (row) => {
    return {
        name: row["Country Name"],
        code: row["Country Code"],
        prevalence: row["2021"]
    }
};

async function loadData(fileName) {
  try {
    const parser = fileName.startsWith("./data/Dexcom") ? parseGlucoseData : parseFoodData;
    const data = await d3.csv(fileName);
    return parser(data);
  } catch (err) {
    console.log(err);
  }
}

function parseGlucoseData(glucoseData) {
  return glucoseData.map(d => ({
    timestamp: new Date(d.timestamp),
    glucose: +d.glucose
  }));
}

function parseFoodData(foodData) {
  const groupedFoods = d3.group(foodData, d => d.time_begin);
  const data = Array.from(groupedFoods, ([timestamp, values]) => ({
    start: new Date(timestamp),
    combined_stats: {
      calories: d3.sum(values, val => +val.calorie),
      sugar: d3.sum(values, val => +val.sugar),
      dietary_fiber: d3.sum(values, val => +val.dietary_fiber),
      total_fat: d3.sum(values, val => +val.total_fat),
      protein: d3.sum(values, val => +val.protein),
      total_carb: d3.sum(values, val => +val.total_carb)
    },
    foods: values.map(d => ({
      start: new Date(d.time_begin),
      end: d.time_end,
      food: d.searched_food !== "" ? d.searched_food : d.logged_food,
      calories: d.calorie !== "" ? d.calorie : "0.0",
      sugar: d.sugar !== "" ? d.sugar : "0.0",
      dietary_fiber: d.dietary_fiber !== "" ? d.dietary_fiber : "0.0",
      total_fat: d.total_fat !== "" ? d.total_fat : "0.0",
      protein: d.protein !== "" ? d.protein : "0.0",
      total_carb: d.total_carb !== "" ? d.total_carb : "0.0",
      amount: d.amount,
      unit: d.unit
    }))
  }));
  return data;
}

const width = 1000;
const height = 400;
let xScale;
let yScale;
let globalGlucoseData;
let globalFoodData;
let globalHrData;
let currDataset = "Dexcom";
let currParticipant = "001";

function createScatterplot(data, restingData) {
  const svg = d3.select("#chart").append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("overflow", "visible");

  const xVar = currDataset === "Dexcom" ? "glucose" : "avgHeartRate";
  const yAxisLabel = currDataset === "Dexcom" ? "Glucose Level (mg/dL)" : "Heart Rate (bpm)";

  xScale = d3.scaleTime()
    .domain(d3.extent(data, d => d.timestamp))
    .range([0, width])
    .nice();

  yScale = d3.scaleLinear()
    .domain([0, 250])
    .range([height, 0]);

  const margin = { top: 30, right: 10, bottom: 30, left: 20 };

  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom
  };

  xScale.range([usableArea.left, usableArea.right]);
  yScale.range([usableArea.bottom, usableArea.top]);

  const dots = svg.append("g").attr("class", "dots");

  dots
    .selectAll("circle")
    .data(data)
    .join("circle")
    .attr("cx", d => xScale(d.timestamp))
    .attr("cy", d => yScale(+d[xVar]))
    .attr("r", 1.5)
    .attr("fill", d => currDataset === "HR" ? "steelblue" : d.highlight) 
    .style("fill-opacity", 0.7);

  if (currDataset === "HR") {
    svg.append("line")
      .attr("x1", usableArea.left)
      .attr("y1", yScale(restingData))
      .attr("x2", usableArea.right)
      .attr("y2", yScale(restingData))
      .attr("stroke", "red")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "10,5");

    svg.append("text")
      .attr("x", usableArea.left + 10)
      .attr("y", yScale(restingData) + 13)
      .attr("dy", "0.35em")
      .attr("fill", "red")
      .attr("font-size", "12px")
      .attr("font-family", "Arial")
      .text("Resting Heart Rate");
  }

  svg.append("text")
    .attr("text-anchor", "middle") 
    .attr("transform", `rotate(-90)`) 
    .attr("x", -height / 2) 
    .attr("y", margin.left / 2 - 30) 
    .style("font-size", "14px")
    .attr("fill", "black")
    .text(yAxisLabel);

  const diagnosisText = isPrediabetic(parseInt(currParticipant));
  const participantNum = parseInt(currParticipant);
  diagnosisText.then((result) => {
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", margin.top / 2)
      .style("font-size", "16px")
      .attr("fill", "black")
      .text(`Participant ${participantNum} - ${result.diagnosis} (HbA1c: ${result.HbA1c}%)`);
  });

  const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${width - margin.right - 150}, ${margin.top})`);

  const legendData = [
    { color: "steelblue", label: "Active Data" },
    { color: "#ccc", label: "Inactive Data" },
    { color: "red", label: "Peak Value" },
    { color: "green", label: "Food Log" }
  ];

  legend.append("rect")
    .attr("x", -15)
    .attr("y", -15)
    .attr("width", 140)
    .attr("height", legendData.length * 20 + 20)
    .attr("rx", 5)
    .attr("ry", 5)
    .attr("fill", "white")
    .attr("stroke", "#ccc")
    .attr("stroke-width", 1);

  legendData.forEach((d, i) => {
    const legendRow = legend.append("g")
      .attr("transform", `translate(0, ${i * 20})`);
    legendRow.append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", d.color);
    legendRow.append("text")
      .attr("x", 20)
      .attr("y", 10)
      .attr("text-anchor", "start")
      .style("font-size", "12px")
      .text(d.label);
  });
}

function createFoodPlot(glucoseData, foodData) {
  const svg = d3.select("#chart")
    .append("svg")
    .attr("viewBox", `0 0 ${width} 400`)
    .style("overflow", "visible");

  const margin = { top: 10, right: 10, bottom: 30, left: 20 };
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom
  };

  const gridlines = svg
    .append("g")
    .attr("class", "gridlines")
    .attr("transform", `translate(${usableArea.left}, 0)`);

  gridlines.call(d3.axisLeft(yScale).tickFormat("").tickSize(-usableArea.width));

  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale);

  svg
    .append("g")
    .attr("transform", `translate(0, ${usableArea.bottom})`)
    .call(xAxis);

  svg
    .append("g")
    .attr("transform", `translate(${usableArea.left}, 0)`)
    .call(yAxis);

  const dots = svg.append("g").attr("class", "dots");

  dots
    .selectAll("circle")
    .data(foodData)
    .join("circle")
    .attr("cx", d => xScale(d.start))
    .attr("cy", 350)
    .attr("r", 3)
    .attr("fill", "green")
    .style("fill-opacity", 0.7)
    .on("mouseenter", (event, group) => {
      d3.select(event.currentTarget).style("fill-opacity", 1);
      updateContent(group);
    })
    .on("mouseleave", (event) => {
      d3.select(event.currentTarget).style("fill-opacity", 0.7);
    });
}

function updateContent(foodGroup) {
  let tableData = d3.select("tbody");
  let tableTime = document.getElementById("food-time");
  tableData.html("");
  tableTime.innerHTML = `<th colspan="6">Time: ${foodGroup.start.toLocaleString()}<th>`;
  foodGroup.foods.forEach((food) => {
    tableData.append("tr").html(`
      <td>${food.food}</td>
      <td>${food.calories}</td>
      <td>${food.sugar}</td>
      <td>${food.dietary_fiber}</td>
      <td>${food.total_fat}</td>
      <td>${food.protein}</td>
      <td>${food.total_carb}</td>
    `);
  });
  if (foodGroup.foods.length > 1) {
    let stats = foodGroup.combined_stats;
    tableData.append("tr").html(`
      <td><strong>Total</strong></td>
      <td>${stats.calories.toFixed(2)}</td>
      <td>${stats.sugar.toFixed(2)}</td>
      <td>${stats.dietary_fiber.toFixed(2)}</td>
      <td>${stats.total_fat.toFixed(2)}</td>
      <td>${stats.protein.toFixed(2)}</td>
      <td>${stats.total_carb.toFixed(2)}</td>
    `);
  }
}

function updateSliderLabel() {
  if (!globalFoodData) return;
  const selectedFilter = d3.select("#filter-type").property("value");
  const slider = d3.select("#filter-slider");
  const minValue = 0;
  const maxValue = d3.max(globalFoodData, d => +d.combined_stats[selectedFilter]) || 1000;
  const stepSize = 1;
  slider
    .attr("min", minValue)
    .attr("max", maxValue)
    .attr("step", stepSize)
    .property("value", minValue);
  d3.select("#filter-value").text(slider.property("value"));
  updatePlots();
}

function updatePlots() {
  if (currDataset !== "Dexcom") {
    return;
  }
  d3.select("#chart").selectAll("svg").remove();
  if (!globalFoodData || !globalGlucoseData) return;
  
  const threshold = +d3.select("#filter-slider").property("value");
  const selectedFilter = d3.select("#filter-type").property("value");
  const isFilteringEnabled = d3.select("#filter-toggle").property("checked");
  d3.select("#filter-value").text(threshold);
  
  const fullGlucoseData = globalGlucoseData.map(d => ({ ...d, highlight: "steelblue" }));
  
  if (!isFilteringEnabled) {
    createScatterplot(fullGlucoseData);
    createFoodPlot(fullGlucoseData, globalFoodData);
    return;
  }
  
  const filteredFoodData = globalFoodData.filter(d =>
    +d.combined_stats[selectedFilter] >= threshold
  );
  
  if (filteredFoodData.length > 0) {
    const maxMacro = d3.max(filteredFoodData, d => +d.combined_stats[selectedFilter]);
    const timeWindow = 2 * 60 * 60 * 1000;
    
    fullGlucoseData.forEach(d => {
      const nearFiltered = filteredFoodData.some(fd =>
        Math.abs(d.timestamp - fd.start.getTime()) < timeWindow
      );
      if (!nearFiltered) {
        d.highlight = "#ccc";
      } else {
        d.highlight = "steelblue";
      }
      const nearMax = filteredFoodData.some(fd =>
        Math.abs(d.timestamp - fd.start.getTime()) < timeWindow &&
        (+fd.combined_stats[selectedFilter] === maxMacro)
      );
      if (nearMax) {
        d.highlight = "red";
      }
    });
  }
  
  createScatterplot(fullGlucoseData, null);
  createFoodPlot(fullGlucoseData, filteredFoodData);
}

let currentCountry;

const displayStats = (filtered_stats) => {
    d3.select("#global-stats").html("");
    var svg = d3.select("#global-stats")
        .append("svg")
        .attr("width", countryWidth + margin.left + margin.right)
        .attr("height", countryHeight + margin.top + margin.bottom)
        .append("g")
        .attr("transform","translate(" + margin.left + "," + margin.top + ")");
    var x = d3.scaleLinear()
        .domain([0, 35])
        .range([0, countryWidth]);
    svg.append("g")
        .attr("transform", "translate(0," + countryHeight + ")")
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "translate(-10,0)rotate(-45)")
        .style("text-anchor", "end");
    var y = d3.scaleBand()
        .range([0, countryHeight])
        .domain(filtered_stats.map(d => d.name))
        .padding(.1);
    svg.append("g")
        .call(d3.axisLeft(y));
    svg.selectAll("myRect")
        .data(filtered_stats)
        .enter()
        .append("rect")
        .attr("x", x(0))
        .attr("y", (d) => y(d.name))
        .attr("width", (d) => x(d.prevalence))
        .attr("height", y.bandwidth())
        .attr("fill", (d) => d.name == currentCountry ? "#0096FF" : "#69b3a2");
    svg.selectAll("myRect")
        .data(filtered_stats)
        .enter()
        .append("text")
        .attr("x", (d) => x(d.prevalence)-4)
        .attr("y", (d) => y(d.name)+12)
        .attr("font-size", "smaller")
        .attr("text-anchor", "end")
        .attr("fill", "#D3D3D3")
        .text((d) => parseFloat(d.prevalence).toFixed(1));
};

async function main(dataset = "001") {
  d3.select("#chart").html("");
  let data;
  let glucoseData = await loadData(`./data/Dexcom_${dataset}.csv`);
  let foodData = await loadData(`./data/Food_Log_${dataset}.csv`);
  let hrData = await d3.csv(`./data/HR_${dataset}.csv`);
  let restingData = null;
  const filterContainer = document.getElementById("filter-container");

  if (currDataset === "Dexcom") {
    data = glucoseData;
    filterContainer.classList.remove("disabled");
  } else {
    data = averageHeartRateData(hrData);
    restingData = restingHeartRateData(hrData);
    filterContainer.classList.add("disabled");
  }
  globalGlucoseData = glucoseData;
  globalFoodData = foodData;
  globalHrData = hrData;
  createScatterplot(data, restingData);
  createFoodPlot(glucoseData, foodData);
  updateSliderLabel();
  const diabetes_stats = await d3.csv("./data/global_stats.csv", countryParser);
  let filtered_stats = diabetes_stats
      .filter((d) => d.prevalence != NaN)
      .sort((a,b) => b.prevalence - a.prevalence);
  displayStats(filtered_stats.slice(0, 20));
  document.getElementById("country-input").addEventListener("input", function(){
      let results = filtered_stats.filter(
          (d) => d.name.toLowerCase().includes(this.value.toLowerCase())
      );
      if (results.length != 0) {
          const idx = filtered_stats.findIndex(
              (d) => d.name == results[0].name
          );
          currentCountry = results[0].name;
          displayStats(filtered_stats
              .slice(Math.max(idx-10, 0), idx >= 10 ? idx+10 : 20)
          );
      }
  });
}

d3.select("#select-dataset").on("change", function() {
  currParticipant = this.value;
  main(currParticipant);
});

d3.select("#select-yaxis").on("change", function() {
  currDataset = this.value;
  main(currParticipant);
});

d3.select("#filter-toggle").on("change", updatePlots);
d3.select("#filter-slider").on("input", updatePlots);

main().then(() => {
  updatePlots();
});

const correctFactors = new Set([
  "High Fasting Glucose Levels",
  "Sedentary Lifestyle",
  "Foods High in Fat",
  "Foods High in Sugar"
]);

document.addEventListener("DOMContentLoaded", function() {
  const guessButton = document.getElementById("submit-guesses");
  if (guessButton) {
    guessButton.addEventListener("click", handleGuessSubmit);
  }
  d3.select("#filter-slider").on("input", function () {
    d3.select("#filter-value").text(this.value);
    updatePlots();
  });
  d3.select("#filter-type").on("change", function () {
    updateSliderLabel();
  });
});

function handleGuessSubmit() {
  const checkboxes = document.querySelectorAll('input[name="factors"]');
  checkboxes.forEach(cb => {
    cb.parentNode.classList.remove("correct-answer","incorrect-answer");
    if (correctFactors.has(cb.value)) {
      cb.parentNode.classList.add("correct-answer");
    } else {
      cb.parentNode.classList.add("incorrect-answer");
    }
  });
  const userSelections = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
  let correctCount = 0;
  let incorrectCount = 0;
  userSelections.forEach(selection => {
    if (correctFactors.has(selection)) {
      correctCount++;
    } else {
      incorrectCount++;
    }
  });
  const missedFactors = [...correctFactors].filter(f => !userSelections.includes(f));
  const totalCorrect = correctFactors.size;
  let resultMsg = `
    <p>You selected <strong>${userSelections.length}</strong> factor(s).</p>
    <p><strong>${correctCount}</strong> out of <strong>${totalCorrect}</strong> match our major risk factors for diabetes.</p>
  `;
  if (incorrectCount > 0) {
    resultMsg += `<p>You included <strong>${incorrectCount}</strong> factor(s) that are not recognized as major contributors.</p>`;
  }
  if (missedFactors.length > 0) {
    resultMsg += `<p>You missed these factor(s): ${missedFactors.join(", ")}.</p>`;
  }
  resultMsg += `
    <p><em>About your results:</em> High fasting glucose levels, sedentary lifestyle, sugary diet, and consuming foods high in fat 
    are the main indicators to diabetes risk.
    
    Notably, sugar itself is not directly a major contributor to diabetes. 
    While processed foods and sugary drinks have been correlated with diabetes, sugar itself is not the only indicator.
    Consuming too much sugar might make you overweight, which does increase your risk to developing diabetes.
    </p>
  `;
  const guessingResults = document.getElementById("guessing-results");
  guessingResults.innerHTML = resultMsg;
}

document.addEventListener("DOMContentLoaded", function() {
  const sections = ["intro", "global-section", "guessing-section", "visualization", "writeup"];
  let currentSectionIndex = 0;
  const viewportWidth = window.innerWidth;

  function transitionToNextSection() {
    if (currentSectionIndex < sections.length - 1) {
      const currentId = sections[currentSectionIndex];
      const nextId = sections[currentSectionIndex + 1];
      d3.select(`#${currentId}`)
        .transition()
        .duration(500)
        .style("transform", `translateX(-${viewportWidth}px)`)
        .style("opacity", 0)
        .on("end", function() {
          d3.select(this)
            .style("display", "none")
            .style("transform", null);
          d3.select(`#${nextId}`)
            .style("display", "block")
            .style("transform", `translateX(${viewportWidth}px)`)
            .style("opacity", 0)
            .transition()
            .duration(650)
            .style("transform", "translateX(0px)")
            .style("opacity", 1);
        });
      currentSectionIndex++;
      updateButtons();
    }
  }

  function transitionToPreviousSection() {
    if (currentSectionIndex > 0) {
      const currentId = sections[currentSectionIndex];
      const prevId = sections[currentSectionIndex - 1];
      d3.select(`#${currentId}`)
        .transition()
        .duration(500)
        .style("transform", `translateX(${viewportWidth}px)`)
        .style("opacity", 0)
        .on("end", function() {
          d3.select(this)
            .style("display", "none")
            .style("transform", null);
          d3.select(`#${prevId}`)
            .style("display", "block")
            .style("transform", `translateX(-${viewportWidth}px)`)
            .style("opacity", 0)
            .transition()
            .duration(650)
            .style("transform", "translateX(0px)")
            .style("opacity", 1);
        });
      currentSectionIndex--;
      updateButtons();
    }
  }

  function updateButtons() {
    if (currentSectionIndex >= sections.length - 1) {
      d3.select("#next-button").style("display", "none");
    } else {
      d3.select("#next-button").style("display", "inline-block");
    }
    if (currentSectionIndex <= 0) {
      d3.select("#prev-button").style("display", "none");
    } else {
      d3.select("#prev-button").style("display", "inline-block");
    }
  }

  document.getElementById("next-button").addEventListener("click", transitionToNextSection);
  document.getElementById("prev-button").addEventListener("click", transitionToPreviousSection);
});
