// Utilities for processing data
// Food_Log
// Dexcom
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";


export function averageHeartRateData(data) {
    // Group data by the minute
    const groupedData = d3.group(
        data,
        // Omit the seconds from the timestamp data
        (d) => d.datetime.substring(0, 16),
    );

    const averagedData = Array.from(groupedData, ([minute, values]) => ({
        timestamp: new Date(minute),
        // Calculate average heart rate (change values to floats)
        avgHeartRate: d3.mean(values, (d)  => parseFloat(d["hr"])),  
    }));
    
    return averagedData;
}

export function restingHeartRateData(data) {
    const heartRates = data.map(d => parseFloat(d.hr));
    const sortedHR = heartRates.sort(d3.ascending);
    // Find resting heart rate (lowest 10% of values)
    const restingData = sortedHR.slice(0, Math.ceil(sortedHR.length * 0.15));
    const restingHeartRate = d3.mean(restingData);
    console.log(sortedHR);
    return restingHeartRate;
}

export async function isPrediabetic(id) {
    const data = await d3.csv(`data/Demographics.csv`);
    const record = data.find(row => row.ID === String(id));
    const HbA1c = parseFloat(record.HbA1c);

    return {
        HbA1c,
        // Diagnose if hba1c is over 5.7%dd
        diagnosis: HbA1c >= 5.7 ? "Prediabetic" : "Normal"
    }; 
}