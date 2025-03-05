import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

// set the dimensions and margins of the graph
var margin = {top: 20, right: 30, bottom: 40, left: 150},
    width = 460 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

const parser = (row) => {
    return {
        name: row["Country Name"],
        code: row['Country Code'],
        prevalence: row['2021'],
    }
}

const main = async function(){
    // Retrieve the data
    const diabetes_stats = await d3.csv("../data/global_stats.csv", parser);
    // We should filter for non-countries here

    // filter the top 10

    let filtered_stats = diabetes_stats
        .sort((a,b) => b.prevalence - a.prevalence)
        .slice(0, 20);


    // Display on chart...
    console.log(filtered_stats);

    // append the svg object to the body of the page
    var svg = d3.select("#global-stats")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");

    var x = d3.scaleLinear()
        .domain([0, 35])
        .range([ 0, width]);

    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "translate(-10,0)rotate(-45)")
        .style("text-anchor", "end");

    // Y axis
    var y = d3.scaleBand()
        .range([ 0, height ])
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
        .attr("fill", "#69b3a2")

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

main();