import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import { averageHeartRateData, restingHeartRateData } from "./scripts/utils.js";

// set the dimensions and margins of country graph
var margin = {top: 20, right: 30, bottom: 40, left: 150},
    countryWidth = 460 - margin.left - margin.right,
    countryHeight = 400 - margin.top - margin.bottom;

const countryParser = (row) => {
    return {
        name: row["Country Name"],
        code: row['Country Code'],
        prevalence: row['2021'],
    }
}

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
    "timestamp": new Date(d.timestamp),
    "glucose": +d.glucose 
  })); 
}

function parseFoodData(foodData) {
  const groupedFoods = d3.group(foodData, d => d.time_begin);

  const data = Array.from(groupedFoods, ([timestamp, values]) => ({
      "start": new Date(timestamp),
      "combined_stats": {
          "calories": d3.sum(values, val => +val.calorie),
          "sugar": d3.sum(values, val => +val.sugar),
          "dietary_fiber": d3.sum(values, val => +val.dietary_fiber),
          "total_fat": d3.sum(values, val => +val.total_fat),
          "protein": d3.sum(values, val => +val.protein),
          "total_carb": d3.sum(values, val => +val.total_carb),
      },
      "foods": values.map(d => ({
          "start": new Date(d.time_begin),
          "end": d.time_end,
          "food": d.searched_food !== "" ? d.searched_food : d.logged_food,
          "calories": d.calorie !== "" ? d.calorie : "0.0",
          "sugar": d.sugar !== "" ? d.sugar : "0.0",
          "dietary_fiber": d.dietary_fiber !== "" ? d.dietary_fiber : "0.0",
          "total_fat": d.total_fat !== "" ? d.total_fat : "0.0",
          "protein": d.protein !== "" ? d.protein : "0.0",
          "total_carb": d.total_carb !== "" ? d.total_carb : "0.0",
          "amount": d.amount,
          "unit": d.unit
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
  // Clear all data from the charts
  const svg = d3
      .select('#chart')
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('overflow', 'visible');

  // Find the right variables based on the selected dataset
  const xVar = currDataset === "Dexcom" ? "glucose" : "avgHeartRate";
  const yAxisLabel = currDataset === "Dexcom" ? "Glucose Level (mg/dL)" : "Heart Rate (bpm)";

  xScale = d3
      .scaleTime()
      .domain(d3.extent(data, d => d.timestamp))
      .range([0, width])
      .nice();

  yScale = d3
      .scaleLinear()
      .domain([0, 250]) 
      .range([height, 0]);

  const margin = { top: 10, right: 10, bottom: 30, left: 20 };

  const usableArea = {
      top: margin.top,
      right: width - margin.right,
      bottom: height - margin.bottom,
      left: margin.left,
      width: width - margin.left - margin.right,
      height: height - margin.top - margin.bottom,
  };

  xScale.range([usableArea.left, usableArea.right]);
  yScale.range([usableArea.bottom, usableArea.top]);

  const dots = svg.append('g').attr('class', 'dots');

  dots
    .selectAll('circle')
    .data(data)
    .join('circle')
    .attr('cx', d => xScale(d.timestamp))
    .attr('cy', d => yScale(+d[xVar]))
    .attr('r', 1.5)
    .attr('fill', d => d.highlight ? '#ccc' : 'steelblue')
    .style('fill-opacity', 0.7);
    

  // Add resting heart rate if dataset is HR 
  if (currDataset === "HR") {
    // Add a horizontal line for the resting heart rate
    svg.append('line')
      .attr('x1', usableArea.left)
      .attr('y1', yScale(restingData))
      .attr('x2', usableArea.right)
      .attr('y2', yScale(restingData))
      .attr('stroke', 'red')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '10,5');

    // Add resting heart rate text
    svg.append('text')
      .attr('x', usableArea.left + 10) 
      .attr('y', yScale(restingData) + 13)   
      .attr('dy', '0.35em')             
      .attr('fill', 'red')
      .attr('font-size', '12px')
      .attr('font-family', 'Arial')
      .text('Resting Heart Rate');
  }

  // Dynamically change the y-axis label based on the selected dataset
  // Add axes labels
  svg.append("text")
  .attr("text-anchor", "middle") 
  .attr("transform", `rotate(-90)`) 
  .attr("x", -height / 2) 
  .attr("y", margin.left / 2 - 30) 
  .style("font-size", "14px")
  .attr("fill", "black")
  .text(yAxisLabel);

}


function createFoodPlot(glucoseData, foodData) {
  const svg = d3
      .select('#chart')
      .append('svg')
      .attr('viewBox', `0 0 ${width} 400`)
      .style('overflow', 'visible');

  const margin = { top: 10, right: 10, bottom: 30, left: 20 };

  const usableArea = {
      top: margin.top,
      right: width - margin.right,
      bottom: height - margin.bottom,
      left: margin.left,
      width: width - margin.left - margin.right,
      height: height - margin.top - margin.bottom,
  };

  const gridlines = svg
      .append('g')
      .attr('class', 'gridlines')
      .attr('transform', `translate(${usableArea.left}, 0)`);

  gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale);

  svg
    .append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(xAxis);

  svg
    .append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(yAxis);

  const dots = svg.append('g').attr('class', 'dots');

  dots
    .selectAll('circle')
    .data(foodData)
    .join('circle')
    .attr('cx', d => xScale(d.start))
    .attr('cy', 350) 
    .attr('r', 3)
    .attr('fill', 'green')
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, group) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      updateContent(group);
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
    });

  
  
  
}

function updateContent(foodGroup) {
  let tableData = d3.select("tbody");
  let tableTime = document.getElementById("food-time");
  tableData.html(""); // clear

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
  if (currDataset !== "Dexcom") return;
  d3.select("#chart").selectAll("svg").remove();

  if (!globalFoodData || !globalGlucoseData) return;

  const threshold = +d3.select("#filter-slider").property("value");
  const selectedFilter = d3.select("#filter-type").property("value");
  const isFilteringEnabled = d3.select("#filter-toggle").property("checked");

  d3.select("#filter-value").text(threshold);

  const fullGlucoseData = globalGlucoseData.map(d => ({ ...d, highlight: false }));

  if (!isFilteringEnabled) {
    createScatterplot(fullGlucoseData);
    createFoodPlot(fullGlucoseData, globalFoodData);
    return;
  }

  const filteredFoodData = globalFoodData.filter(d =>
    +d.combined_stats[selectedFilter] >= threshold
  );

  const validTimestamps = new Set(filteredFoodData.map(d => d.start.getTime()));

  if (validTimestamps.size > 0) {
    fullGlucoseData.forEach(d => {
      d.highlight = !Array.from(validTimestamps).some(time =>
        Math.abs(d.timestamp - time) < 2 * 60 * 60 * 1000 // 2 hour window
      );
    });
  }

  createScatterplot(fullGlucoseData);
  createFoodPlot(fullGlucoseData, filteredFoodData);
}




let currentCountry;

const displayStats = (filtered_stats) => {

    d3.select("#global-stats").html("")

    // append the svg object to the body of the page
    var svg = d3.select("#global-stats")
        .append("svg")
        .attr("width", countryWidth + margin.left + margin.right)
        .attr("height", countryHeight + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");

    var x = d3.scaleLinear()
        .domain([0, 35])
        .range([ 0, countryWidth]);

    svg.append("g")
        .attr("transform", "translate(0," + countryHeight + ")")
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "translate(-10,0)rotate(-45)")
        .style("text-anchor", "end");

    // Y axis
    var y = d3.scaleBand()
        .range([ 0, countryHeight ])
        .domain(filtered_stats.map(d => d.name))
        .padding(.1);

    svg.append("g")
        .call(d3.axisLeft(y))

    //Bars
    svg.selectAll("myRect")
        .data(filtered_stats)
        .enter()
        .append("rect")
        .attr("x", x(0) )
        .attr("y", (d) => y(d.name))
        .attr("width", (d) => x(d.prevalence))
        .attr("height", y.bandwidth() )
        .attr("fill", (d) => d.name == currentCountry ? "#0096FF" :"#69b3a2")
        

    //Text
    svg.selectAll("myRect")
        .data(filtered_stats)
        .enter()
        .append("text")
        .attr("x", (d) => x(d.prevalence)-4 )
        .attr("y", (d) => y(d.name)+12)
        .attr("font-size", 'smaller')
        .attr('text-anchor', 'end')
        .attr("fill", "#69b3a2")
        .text((d) => parseFloat(d.prevalence).toFixed(1))
        .attr("fill", "#D3D3D3")
}


// Function to load data and create plots
async function main(dataset = "001") {
  d3.select("#chart").selectAll("*").remove();
  let data;
  let glucoseData = await loadData(`./data/Dexcom_${dataset}.csv`);
  let foodData = await loadData(`./data/Food_Log_${dataset}.csv`);
  let hrData = await d3.csv(`./data/HR_${dataset}.csv`);
  let restingData = null;

  if (currDataset === "Dexcom") {
    data = glucoseData;
  } else {
    data = averageHeartRateData(hrData);
    restingData = restingHeartRateData(hrData);
    console.log(restingData);
  }

  globalGlucoseData = glucoseData;
  globalFoodData = foodData;
  globalHrData = hrData;

  createScatterplot(data, restingData);
  createFoodPlot(glucoseData, foodData);
  updateSliderLabel();

  // Retrieve the country data
  const diabetes_stats = await d3.csv("./data/global_stats.csv", countryParser);
  // We should filter for non-countries here

  // filter the top 10

  let filtered_stats = diabetes_stats
      .filter((d) => d.prevalence != NaN)
      .sort((a,b) => b.prevalence - a.prevalence)

  displayStats(filtered_stats.slice(0, 20))

  document.getElementById("country-input").addEventListener("input", function(){
      let results = filtered_stats.filter(
          (d) => d.name.toLowerCase().includes(this.value.toLowerCase())
      )
      if (results.length != 0){
          const idx = filtered_stats.findIndex(
              (d) => d.name == results[0].name
          )
          currentCountry = results[0].name
          displayStats(filtered_stats
              .slice(Math.max(idx-10, 0), idx >= 10 ? idx+10 : 20)
          )
      }
  })
}

// Change the selected participant when selected in dropdown
d3.select("#select-dataset").on("change", function() {
  currParticipant = this.value;
  main(currParticipant);
});

// Change curr Dataset when selected in dropdown
d3.select("#select-yaxis").on("change", function() {
  currDataset = this.value;
  main(currParticipant);
  console.log(currDataset);
});

d3.select("#filter-toggle").on("change", updatePlots);

d3.select("#filter-slider").on("input", updatePlots);

main().then(() => {
  updatePlots(); 
});



// Add JS Code for the Diabetes Risk Factor Quiz
const correctFactors = new Set([
  "high_fasting_glucose",
  "sedentary_lifestyle",
  "foods_high_in_fat"
]);

document.addEventListener("DOMContentLoaded", function() {
  const guessButton = document.getElementById("submit-guesses");
  if (guessButton) {
    guessButton.addEventListener("click", handleGuessSubmit);
  }
});


function handleGuessSubmit() {
  const checkboxes = document.querySelectorAll('input[name="factors"]:checked');
  const userSelections = Array.from(checkboxes).map(cb => cb.value);

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
    <p><em>Note:</em> High fasting glucose levels, sedentary lifestyle, and consuming foods high in fat 
    can contribute to diabetes risk. Gender, in this simplified quiz, is not considered a main factor.</p>
  `;

  const guessingResults = document.getElementById("guessing-results");
  guessingResults.innerHTML = resultMsg;
}
