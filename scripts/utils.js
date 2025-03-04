// Utilities for processing data
// Food_Log
// Dexcom
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";


function averageHeartRateData(data) {
    // Group data by the minute
    const groupedData = d3.group(
        data,
        // Omit the seconds from the timestamp data
        (d) => d.datetime.substring(0, 16),
    );

    const averagedData = Array.from(groupedData, ([minute, values]) => ({
        minute,
        // Calculate average heart rate (change values to floats)
        avgHeartRate: d3.mean(values, (d)  => parseFloat(d[" hr"])),  
    }));
    
    return averagedData;
}

let hrData = await d3.csv("data/HR_001.csv");
console.log(averageHeartRateData(hrData));