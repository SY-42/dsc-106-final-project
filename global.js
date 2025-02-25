import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

async function loadData(fileName) {
  try{
    const parser =  fileName.startsWith("./data/Dexcom") ? parseGlucoseData : parseFoodData;
    const data = await d3.csv(fileName);
    return parser(data);
  }catch(err){
    console.log(err);
  }
}


function parseGlucoseData(glucoseData){
  return glucoseData.map(d => ({
    "timestamp": new Date(d.timestamp),
    "glucose": d.glucose 
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
          "food": d.searched_food != "" ? d.searched_food :  d.logged_food,
          "calories": d.calorie != "" ? d.calorie : "0.0",
          "sugar": d.sugar != "" ? d.sugar : "0.0",
          "dietary_fiber": d.dietary_fiber != "" ? d.dietary_fiber : "0.0",
          "total_fat": d.total_fat != "" ? d.total_fat : "0.0",
          "protein": d.protein != "" ? d.protein : "0.0",
          "total_carb": d.total_carb != "" ? d.total_carb : "0.0",
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

function createGlucoseScatterplot(glucoseData) {
  const svg = d3
      .select('#chart')
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('overflow', 'visible');

  xScale = d3
      .scaleTime()
      .domain(d3.extent(glucoseData, d => d.timestamp))
      .range([0, width])
      .nice();

  yScale = d3.scaleLinear()
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
      .data(glucoseData)
      .join('circle')
      .attr('cx', d => xScale(d.timestamp))
      .attr('cy', d => yScale(d.glucose))
      .attr('r', 1.5)  
      .attr('fill', d => (d.highlight ? '#ccc' : 'steelblue'))
      .style('fill-opacity', 0.7);
}


function createFoodPlot(glucoseData, foodData){
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

  // Create gridlines as an axis with no labels and full-width ticks
  gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

  // Create the axes
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale);

  // Add X axis
  svg
  .append('g')
  .attr('transform', `translate(0, ${usableArea.bottom})`)
  .call(xAxis);

  // Add Y axis
  svg 
  .append('g')
  .attr('transform', `translate(${usableArea.left}, 0)`)
  .call(yAxis);

  const dots = svg.append('g').attr('class', 'dots');

  dots
    .selectAll('circle')
    .data(foodData)
    .join('circle')
    .attr('cx', (d) => xScale(d.start))
    .attr('cy', 350)
    .attr('r', 3)
    .attr('fill', 'green')
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, group) => {
      d3.select(event.currentTarget).style('fill-opacity', 1); // Full opacity on hover 
      
      updateContent(group);
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
    });
}

function prettySummary(foodStats){
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/entries
  return Object.entries(foodStats).map(val => {
    return `${val[0].replace("_", " ")}: ${val[1]}`
  }).join("\n")
}


function updateContent(foodGroup) {
  let tableData = d3.select("tbody");
  let tableTime = document.getElementById("food-time");
  // Clear Text Content
  tableData.html("");

  tableTime.innerHTML = `<th colspan="6">Time: ${foodGroup.start.toLocaleString()}<th>`;


  // Add Individual Food Data
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
  
  let stats = foodGroup.combined_stats;
  // Add Summary Data if more than 1 food
  if (foodGroup.foods.length > 1) {
    tableData.append("tr").html(`
      <td><strong>Total</strong></td>
      <td>${stats.calories.toFixed(2)}</td>
      <td>${stats.sugar.toFixed(2)}</td>
      <td>${stats.dietary_fiber.toFixed(2)}</td>
      <td>${stats.total_fat.toFixed(2)}</td>
      <td>${stats.protein.toFixed(2)}</td>
      <td>${stats.total_carb.toFixed(2)}</td>
    `)};
  
  
}


// Create the slider and dropdown

document.addEventListener("DOMContentLoaded", function () {
  // Attach event listeners to slider and dropdown
  d3.select("#filter-slider").on("input", function () {
      d3.select("#filter-value").text(this.value); // Update displayed value
      updatePlots();
  });

  d3.select("#filter-type").on("change", function () {
      updateSliderLabel();
  });
});

function updateSliderLabel() {
  if (!globalFoodData) return;

  // Get the selected filter type
  const selectedFilter = d3.select("#filter-type").property("value");
  const slider = d3.select("#filter-slider");

  // Compute min and max based on data
  const minValue = 0;
  const maxValue = d3.max(globalFoodData, d => +d.combined_stats[selectedFilter]);

  const stepSize = 1;

  slider
      .attr("min", minValue)
      .attr("max", maxValue)
      .attr("step", stepSize)
      .property("value", minValue);

  // Update displayed slider value
  d3.select("#filter-value").text(slider.property("value"));

  // Trigger plot update
  updatePlots();
}

function updatePlots() {
  d3.select("#chart").selectAll("svg").remove();

  if (!globalFoodData || !globalGlucoseData) return;

  const threshold = +d3.select("#filter-slider").property("value");
  const selectedFilter = d3.select("#filter-type").property("value");
  const isFilteringEnabled = d3.select("#filter-toggle").property("checked");

  d3.select("#filter-value").text(threshold);

  const fullGlucoseData = globalGlucoseData.map(d => ({ ...d, highlight: false }));

  if (!isFilteringEnabled) {
      console.log("Filtering is disabled: Showing full dataset.");
      createGlucoseScatterplot(fullGlucoseData);
      createFoodPlot(fullGlucoseData, globalFoodData);
      return;
  }

  // Filter food data based on the threshold
  const filteredFoodData = globalFoodData.filter(d =>
    +d.combined_stats[selectedFilter] >= threshold
  );

  const validTimestamps = new Set(filteredFoodData.map(d => d.start.getTime()));

  // Mark glucose points as grey if they are NOT near relevant food events
  if (validTimestamps.size > 0) {
    fullGlucoseData.forEach(d => {
        d.highlight = !Array.from(validTimestamps).some(time =>
            Math.abs(d.timestamp - time) < 2 * 60 * 60 * 1000 // Within 2 hours
        );
    });

  createGlucoseScatterplot(fullGlucoseData);
  createFoodPlot(fullGlucoseData, filteredFoodData);
}};



let globalGlucoseData;
let globalFoodData;

async function main(dataset = "001"){
  
  // Caden sets up the dropdown
  // Dropdown selects the food/glucose data for the person

  // Load that
  // Sage parses the code
  let glucoseData = await loadData(`./data/Dexcom_${dataset}.csv`);
  let foodData = await loadData(`./data/Food_Log_${dataset}.csv`);
  
  globalGlucoseData = glucoseData;
  globalFoodData = foodData;

  // Andy sets the slider filter here
  // We filter the data here

  createGlucoseScatterplot(glucoseData);
  createFoodPlot(glucoseData,foodData);
  updateSliderLabel();
}

// Dropdown Select
d3.select("#select-dataset").on("change", function() {
  // Remove old data
  d3.select("#chart").selectAll("*").remove();

  // Import New Data
  const selectedDataset = this.value;
  main(selectedDataset);
});

main().then(() => {
  updatePlots(); // Ensure the graph starts with filtering off
});

// Listen for checkbox toggle event
d3.select("#filter-toggle").on("change", updatePlots);

// Ensure slider movement also updates the plot
d3.select("#filter-slider").on("input", updatePlots);


