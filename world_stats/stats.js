import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";


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

    // Display on chart...
    console.log(diabetes_stats);
}

main();