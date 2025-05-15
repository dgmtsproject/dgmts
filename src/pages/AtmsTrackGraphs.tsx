import React, { useState, useEffect, useRef } from "react";
import HeaNavLogo from "../components/HeaNavLogo";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import TrackMerger from "../components/MergeATMSTracks";
import html2canvas from "html2canvas";
import Plot from "react-plotly.js";
import { Shape, Annotations } from "plotly.js";
import MainContentWrapper from "../components/MainContentWrapper";

const AtmsTrackGraphs: React.FC = () => {
    const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
    const [processedData, setProcessedData] = useState<string[][]>([]);
    const [selectedRowTime1, setSelectedRowTime1] = useState<string>("placeholder");
    const [timeColumn, setTimeColumn] = useState<string[]>([]);
    const [showGraph, setShowGraph] = useState(false);
    const [headers, setHeaders] = useState<string[]>([]);
    const [xScale, setXScale] = useState<number>(1);
    const [yScale, setYScale] = useState<number>(1);
    const [selectedTrkColOption, setSelectedTrkColOption] = useState<string>("placeholder");
    const [selectedTrk, setSelectedTrk] = useState<string>("placeholder");
    // const [yDomain, setYDomain] = useState([-0.5, 0.5]);
    const [combinedGraphData, setCombinedGraphData] = useState<
        Array<{
            x: number;
            amtsValue: number | null;
            prismA: number | null;
            prismB: number | null;
            amtsColName?: string | null;
            prismAColName?: string | null;
            prismBColName?: string | null;
            time: string;
        }>
    >([]);
    const [Amts2combinedGraphData, setAmts2CombinedGraphData] = useState<
        Array<{
            x: number;
            amtsValue: number | null;
            amts2Value: number | null; // Added for AMTS-2
            prismA: number | null;
            prismB: number | null;
            amtsColName?: string | null;
            amts2ColName?: string | null; // Added for AMTS-2 
            prismAColName?: string | null;
            prismBColName?: string | null;
            time: string;
        }>
    >([]);
    const [xDomain, setXDomain] = useState<[number, number]>([-50, 50]);
    const [AmtsxDomain, setAmtsXDomain] = useState<[number, number]>([-335, 50]);

    const amsts_track2_prism_size = 16;
    const amts_track2_start_distance = -10;
    const amts2_track2_start_distance = -100;
    const amts2_track3_start_distance = -335;
    const amts_track3_prism_size = 6;
    const amts_track3_start_distance = 10;
    const amts_offset = 25;

    const selectedTrkColOptions = [
        "Easting",
        "Northing",
        "Height"
    ];

    const processSaveRef = useRef<HTMLButtonElement>(null);
    const handleMergeClick = () => {
        processSaveRef.current?.click(); // simulate click
    };

    const handleProcess = () => {
        const fileData = localStorage.getItem("mergedExcelFile");
        if (!fileData) return;

        const byteCharacters = atob(fileData);
        const byteNumbers = new Array(byteCharacters.length)
            .fill(null)
            .map((_, i) => byteCharacters.charCodeAt(i));
        const byteArray = new Uint8Array(byteNumbers);

        const workbook = XLSX.read(byteArray, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];

        if (jsonData.length === 0) return;

        const headers = jsonData[0];
        const result: (string | number)[][] = [];
        const timeData: string[] = [];

        // Find indices for different data sections
        const tk2StartIndex = 1; // TK-2 data starts right after timestamp
        const tk2EndIndex = headers.findIndex(h =>
            typeof h === 'string' && h.includes('LBN-TP-TK3')
        );
        const tk3StartIndex = tk2EndIndex > 0 ? tk2EndIndex :
            headers.findIndex(h => typeof h === 'string' && h.includes('LBN-TP-TK3'));
        const tk3EndIndex = headers.findIndex(h =>
            typeof h === 'string' && h.includes('LBN-AMTS')
        );
        const atmsStartIndex = tk3EndIndex > 0 ? tk3EndIndex :
            headers.findIndex(h => typeof h === 'string' && h.includes('LBN-AMTS'));

        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            const newRow: (string | number)[] = [row[0]];
            timeData.push(row[0]?.toString() || "");

            // Process TK-2 data (pairs of columns)
            for (let j = tk2StartIndex; j < (tk2EndIndex > 0 ? tk2EndIndex : headers.length); j += 2) {
                const val1 = row[j];
                const val2 = row[j + 1];
                newRow.push(val1 ?? "", val2 ?? "");

                if (
                    val1 !== undefined &&
                    val2 !== undefined &&
                    !isNaN(Number(val1)) &&
                    !isNaN(Number(val2))
                ) {
                    const diff = Number(val1) - Number(val2);
                    newRow.push(diff);
                } else {
                    newRow.push("");
                }
            }

            // Process TK-3 data (pairs of columns)
            if (tk3StartIndex > 0) {
                for (let j = tk3StartIndex; j < (tk3EndIndex > 0 ? tk3EndIndex : headers.length); j += 2) {
                    const val1 = row[j];
                    const val2 = row[j + 1];
                    newRow.push(val1 ?? "", val2 ?? "");

                    if (
                        val1 !== undefined &&
                        val2 !== undefined &&
                        !isNaN(Number(val1)) &&
                        !isNaN(Number(val2))
                    ) {
                        const diff = Number(val1) - Number(val2);
                        newRow.push(diff);
                    } else {
                        newRow.push("");
                    }
                }
            }

            // Add AMTS data (no processing, just append)
            if (atmsStartIndex > 0) {
                newRow.push(...row.slice(atmsStartIndex));
            }

            result.push(newRow);
        }

        const newHeader: (string | number)[] = [headers[0]]; // timestamp

        // Create headers for TK-2 differences
        for (let j = tk2StartIndex; j < (tk2EndIndex > 0 ? tk2EndIndex : headers.length); j += 2) {
            const h1 = headers[j] ?? `Col${j}`;
            const h2 = headers[j + 1] ?? `Col${j + 1}`;
            let label = "Difference";

            if (typeof h1 === "string" && typeof h2 === "string") {
                const baseName1 = h1.split(' - ')[0];
                const baseName2 = h2.split(' - ')[0];
                const baseName = baseName1 === baseName2 ? baseName1 : `${baseName1},${baseName2}`;

                if (h1.toLowerCase().includes("easting") || h2.toLowerCase().includes("easting")) {
                    label = `${baseName} - Easting Difference`;
                } else if (h1.toLowerCase().includes("northing") || h2.toLowerCase().includes("northing")) {
                    label = `${baseName} - Northing Difference`;
                } else if (h1.toLowerCase().includes("height") || h2.toLowerCase().includes("height")) {
                    label = `${baseName} - Height Difference`;
                } else {
                    label = `${baseName} - Difference`;
                }
            }
            newHeader.push(h1, h2, label);
        }

        // Create headers for TK-3 differences
        if (tk3StartIndex > 0) {
            for (let j = tk3StartIndex; j < (tk3EndIndex > 0 ? tk3EndIndex : headers.length); j += 2) {
                const h1 = headers[j] ?? `Col${j}`;
                const h2 = headers[j + 1] ?? `Col${j + 1}`;
                let label = "Difference";

                if (typeof h1 === "string" && typeof h2 === "string") {
                    const baseName1 = h1.split(' - ')[0];
                    const baseName2 = h2.split(' - ')[0];
                    const baseName = baseName1 === baseName2 ? baseName1 : `${baseName1},${baseName2}`;

                    if (h1.toLowerCase().includes("easting") || h2.toLowerCase().includes("easting")) {
                        label = `${baseName} - Easting Difference `;
                    } else if (h1.toLowerCase().includes("northing") || h2.toLowerCase().includes("northing")) {
                        label = `${baseName} - Northing Difference `;
                    } else if (h1.toLowerCase().includes("height") || h2.toLowerCase().includes("height")) {
                        label = `${baseName} - Height Difference `;
                    } else {
                        label = `${baseName} - Difference `;
                    }
                }
                newHeader.push(h1, h2, label);
            }
        }

        // Add AMTS headers
        if (atmsStartIndex > 0) {
            newHeader.push(...headers.slice(atmsStartIndex));
        }

        result.unshift(newHeader);

        const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(result);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Processed");

        const wbout = XLSX.write(wb, {
            bookType: "xlsx",
            type: "array",
            cellStyles: true,
        });

        const blob = new Blob([wbout], { type: "application/octet-stream" });
        setProcessedBlob(blob);
        setShowGraph(true);

        localStorage.setItem("processedHeaders", JSON.stringify(newHeader));
        localStorage.setItem("processedData", JSON.stringify(result));
        setHeaders(newHeader as string[]);
        setProcessedData(result as string[][]);
    };
    useEffect(() => {
        const storedHeaders = localStorage.getItem("processedHeaders");
        const storedData = localStorage.getItem("processedData");

        if (storedHeaders && storedData) {
            setHeaders(JSON.parse(storedHeaders));
            setProcessedData(JSON.parse(storedData));
        }
    }, []);

    const handleDownload = () => {
        if (processedBlob) {
            saveAs(processedBlob, "difference_output-and-amts.xlsx");
        }
    };
    const shapes = [
        // Ohio Bridge reference area (only for LBN-TP-TK2)
        ...(headers.some(h => h.includes('LBN-TP-TK2')) && combinedGraphData.length > 7 && combinedGraphData.length > 10
            ? [{
                type: 'rect',
                x0: combinedGraphData[7].x,
                x1: combinedGraphData[10].x,
                y0: -0.5 / yScale,
                y1: 0.5 / yScale,
                fillcolor: 'rgba(255, 255, 255, 0.7)',
                line: {
                    color: '#ffcc00',
                    width: 2,
                    dash: 'dash'
                },
                layer: 'below'
            }]
            : []),
        // AMTS-2 reference line (vertical at x=0)
        {
            type: 'line',
            x0: 0,
            x1: 0,
            y0: -0.5 / yScale,
            y1: combinedGraphData[0]?.amtsValue || 0,
            line: {
                color: 'red',
                width: 2
            }
        },

        // Alert lines (red)
        {
            type: 'line',
            x0: 0,
            x1: 1,
            xref: 'paper',
            y0: 0.875,
            y1: 0.875,
            line: { color: 'red', width: 1, dash: 'solid' },
        },
        {
            type: 'line',
            x0: 0,
            x1: 1,
            xref: 'paper',
            y0: -0.875,
            y1: -0.875,
            line: { color: 'red', width: 1, dash: 'solid' },
        },
        // Warning lines (orange)
        {
            type: 'line',
            x0: 0,
            x1: 1,
            xref: 'paper',
            y0: 0.5,
            y1: 0.5,
            line: { color: 'orange', width: 1, dash: 'solid' },
        },
        {
            type: 'line',
            x0: 0,
            x1: 1,
            xref: 'paper',
            y0: -0.5,
            y1: -0.5,
            line: { color: 'orange', width: 1, dash: 'solid' },
        },
        // Internal warning lines (yellow)
        {
            type: 'line',
            x0: 0,
            x1: 1,
            xref: 'paper',
            y0: 0.25,
            y1: 0.25,
            line: { color: 'yellow', width: 1, dash: 'solid' },
        },
        {
            type: 'line',
            x0: 0,
            x1: 1,
            xref: 'paper',
            y0: -0.25,
            y1: -0.25,
            line: { color: 'yellow', width: 1, dash: 'solid' },
        }


    ].filter(Boolean) as Partial<Shape>[];

    const annotations = [
        // Ohio Bridge label
        ...(headers.some(h => h.includes('LBN-TP-TK2')) && combinedGraphData.length > 7 && combinedGraphData.length > 10
            ? [{
                x: (combinedGraphData[7].x + combinedGraphData[10].x) / 2,
                y: 0.5 / yScale,
                text: 'Ohio Bridge',
                showarrow: false,
                font: {
                    size: 12,
                    color: '#333',
                    weight: 'bold'
                },
                yref: 'y',
                yanchor: 'bottom'
            }]
            : []),
        // AMTS-2 label
        ...(combinedGraphData[0]?.amtsValue !== undefined
            ? [{
                x: 0,
                y: combinedGraphData[0]?.amtsValue || 0,
                text: 'AMTS',
                font: {
                    color: 'red'
                },
                yshift: 10,
                xanchor: 'left'
            }]
            : []),

        // Alert line labels (floating at left edge)
        {
            x: 0.001,
            xref: 'paper',
            y: 0.88,
            yref: 'y',
            text: 'Alert',
            showarrow: false,
            font: { color: 'black', size: 10 },
            bgcolor: 'rgba(255,255,255,0.8)',
            xanchor: 'left'
        },
        {
            x: 0.001,
            xref: 'paper',
            y: -0.88,
            yref: 'y',
            text: 'Alert',
            showarrow: false,
            font: { color: 'black', size: 10 },
            bgcolor: 'rgba(255,255,255,0.8)',
            xanchor: 'left'
        },
        // Warning line labels
        {
            x: 0.001,
            xref: 'paper',
            y: 0.51,
            yref: 'y',
            text: 'Warning',
            showarrow: false,
            font: { color: 'black', size: 10 },
            bgcolor: 'rgba(255,255,255,0.8)',
            xanchor: 'left'
        },
        {
            x: 0.001,
            xref: 'paper',
            y: -0.51,
            yref: 'y',
            text: 'Warning',
            showarrow: false,
            font: { color: 'black', size: 10 },
            bgcolor: 'rgba(255,255,255,0.8)',
            xanchor: 'left'
        },
        // Internal warning line labels
        {
            x: 0.001,
            xref: 'paper',
            y: 0.26,
            yref: 'y',
            text: 'Internal',
            showarrow: false,
            font: { color: 'black', size: 10 },
            bgcolor: 'rgba(255,255,255,0.8)',
            xanchor: 'left'
        },
        {
            x: 0.001,
            xref: 'paper',
            y: -0.26,
            yref: 'y',
            text: 'Internal',
            showarrow: false,
            font: { color: 'black', size: 10 },
            bgcolor: 'rgba(255,255,255,0.8)',
            xanchor: 'left'
        }

    ].filter(Boolean) as Partial<Annotations>[];

    const shapesForAmts2 = [
        // Ohio Bridge reference area for Track 3
        ...(headers.some(h => h.includes('LBN-TP-TK3')) && Amts2combinedGraphData.length > 0 && selectedTrk === 'LBN-TP-TK-3'
            ? [{
                type: 'rect',
                x0: Amts2combinedGraphData[1]?.x,
                x1: Amts2combinedGraphData[3]?.x,
                y0: -0.5 / yScale,
                y1: 0.5 / yScale,
                fillcolor: 'rgba(255, 255, 255, 0.7)',
                line: {
                    color: '#ffcc00',
                    width: 2,
                    dash: 'dash'
                },
                layer: 'below'
            }]
            : []),

        // Washington Channel Bridge for Track 2
        ...(headers.some(h => h.includes('LBN-TP-TK2')) && Amts2combinedGraphData.length > 0 && selectedTrk === 'LBN-TP-TK-2'
            ? [{
                type: 'rect',
                x0: Amts2combinedGraphData[7]?.x,
                x1: Amts2combinedGraphData[12]?.x,
                y0: -0.5 / yScale,
                y1: 0.5 / yScale,
                fillcolor: 'rgba(255, 255, 255, 0.7)',
                line: {
                    color: '#ffcc00',
                    width: 2,
                    dash: 'dash'
                },
                layer: 'below'
            }]
            : []),

        // Washington Channel Bridge for Track 3
        ...(headers.some(h => h.includes('LBN-TP-TK3')) && Amts2combinedGraphData.length > 0 && selectedTrk === 'LBN-TP-TK-3'
            ? [{
                type: 'rect',
                x0: Amts2combinedGraphData[17]?.x,
                x1: Amts2combinedGraphData[22]?.x,
                y0: -0.5 / yScale,
                y1: 0.5 / yScale,
                fillcolor: 'rgba(255, 255, 255, 0.7)',
                line: {
                    color: '#ffcc00',
                    width: 2,
                    dash: 'dash'
                },
                layer: 'below'
            }]
            : []),

        // AMTS-2 reference line (vertical at x=0)
        {
            type: 'line',
            x0: 0,
            x1: 0,
            y0: -0.5 / yScale,
            y1: Amts2combinedGraphData[0]?.amts2Value || 0,
            line: {
                color: 'red',
                width: 2
            }
        },

        // Alert lines (red)
        {
            type: 'line',
            x0: 0,
            x1: 1,
            xref: 'paper',
            y0: 0.875,
            y1: 0.875,
            line: { color: 'red', width: 1, dash: 'solid' },
        },
        {
            type: 'line',
            x0: 0,
            x1: 1,
            xref: 'paper',
            y0: -0.875,
            y1: -0.875,
            line: { color: 'red', width: 1, dash: 'solid' },
        },
        // Warning lines (orange)
        {
            type: 'line',
            x0: 0,
            x1: 1,
            xref: 'paper',
            y0: 0.5,
            y1: 0.5,
            line: { color: 'orange', width: 1, dash: 'solid' },
        },
        {
            type: 'line',
            x0: 0,
            x1: 1,
            xref: 'paper',
            y0: -0.5,
            y1: -0.5,
            line: { color: 'orange', width: 1, dash: 'solid' },
        },
        // Internal warning lines (yellow)
        {
            type: 'line',
            x0: 0,
            x1: 1,
            xref: 'paper',
            y0: 0.25,
            y1: 0.25,
            line: { color: 'yellow', width: 1, dash: 'solid' },
        },
        {
            type: 'line',
            x0: 0,
            x1: 1,
            xref: 'paper',
            y0: -0.25,
            y1: -0.25,
            line: { color: 'yellow', width: 1, dash: 'solid' },
        }


    ].filter(Boolean) as Partial<Shape>[];
    const annotationsForAmts2 = [
        // Ohio Bridge label for Track 3
        ...(headers.some(h => h.includes('LBN-TP-TK3')) && Amts2combinedGraphData.length > 0 && selectedTrk === 'LBN-TP-TK-3'
            ? [{
                x: (Amts2combinedGraphData[1]?.x + Amts2combinedGraphData[3]?.x) / 2,
                y: 0.5 / yScale,
                text: 'Ohio Bridge',
                showarrow: false,
                font: {
                    size: 12,
                    color: '#333',
                    weight: 'bold'
                },
                yref: 'y',
                yanchor: 'bottom'
            }]
            : []),

        // Washington Channel Bridge label for Track 2
        ...(headers.some(h => h.includes('LBN-TP-TK2')) && Amts2combinedGraphData.length > 0 && selectedTrk === 'LBN-TP-TK-2'
            ? [{
                x: (Amts2combinedGraphData[7]?.x + Amts2combinedGraphData[12]?.x) / 2,
                y: 0.5 / yScale,
                text: 'Washington Channel Bridge',
                showarrow: false,
                font: {
                    size: 12,
                    color: '#333',
                    weight: 'bold'
                },
                yref: 'y',
                yanchor: 'bottom'
            }]
            : []),

        // Washington Channel Bridge label for Track 3
        ...(headers.some(h => h.includes('LBN-TP-TK3')) && Amts2combinedGraphData.length > 0 && selectedTrk === 'LBN-TP-TK-3'
            ? [{
                x: (Amts2combinedGraphData[17]?.x + Amts2combinedGraphData[22]?.x) / 2,
                y: 0.5 / yScale,
                text: 'Washington Channel Bridge',
                showarrow: false,
                font: {
                    size: 12,
                    color: '#333',
                    weight: 'bold'
                },
                yref: 'y',
                yanchor: 'bottom'
            }]
            : []),

        // AMTS-2 label
        ...(Amts2combinedGraphData[0]?.amts2Value !== undefined
            ? [{
                x: 0,
                y: Amts2combinedGraphData[0]?.amts2Value || 0,
                text: 'AMTS',
                font: {
                    color: 'red'
                },
                yshift: 10,
                xanchor: 'left'
            }]
            : []),


    // Alert line labels (floating at left edge)
        {
            x: 0.001,
            xref: 'paper',
            y: 0.88,
            yref: 'y',
            text: 'Alert',
            showarrow: false,
            font: { color: 'black', size: 10 },
            bgcolor: 'rgba(255,255,255,0.8)',
            xanchor: 'left'
        },
        {
            x: 0.001,
            xref: 'paper',
            y: -0.88,
            yref: 'y',
            text: 'Alert',
            showarrow: false,
            font: { color: 'black', size: 10 },
            bgcolor: 'rgba(255,255,255,0.8)',
            xanchor: 'left'
        },
        // Warning line labels
        {
            x: 0.001,
            xref: 'paper',
            y: 0.51,
            yref: 'y',
            text: 'Warning',
            showarrow: false,
            font: { color: 'black', size: 10 },
            bgcolor: 'rgba(255,255,255,0.8)',
            xanchor: 'left'
        },
        {
            x: 0.001,
            xref: 'paper',
            y: -0.51,
            yref: 'y',
            text: 'Warning',
            showarrow: false,
            font: { color: 'black', size: 10 },
            bgcolor: 'rgba(255,255,255,0.8)',
            xanchor: 'left'
        },
        // Internal warning line labels
        {
            x: 0.001,
            xref: 'paper',
            y: 0.26,
            yref: 'y',
            text: 'Internal',
            showarrow: false,
            font: { color: 'black', size: 10 },
            bgcolor: 'rgba(255,255,255,0.8)',
            xanchor: 'left'
        },
        {
            x: 0.001,
            xref: 'paper',
            y: -0.26,
            yref: 'y',
            text: 'Internal',
            showarrow: false,
            font: { color: 'black', size: 10 },
            bgcolor: 'rgba(255,255,255,0.8)',
            xanchor: 'left'
        }

    ].filter(Boolean) as Partial<Annotations>[];
    // filter the time values only get the time that the header which starts with "LBN-AMTS1-" has the value
    useEffect(() => {
        if (processedData.length > 1) {
            console.log('Full processedData:', processedData);
            const headers = processedData[0] || [];
            const amts1Columns = headers
                .map((header, index) => {
                    if (typeof header === 'string') {
                        const lowerHeader = header.toLowerCase();
                        if (lowerHeader.includes('amts1') ||
                            lowerHeader.includes('amts-1') ||
                            lowerHeader.includes('lbn-amts2') ||
                            lowerHeader.includes('amts-2') ||
                            lowerHeader.includes('amts2') ||
                            lowerHeader.includes('atms1')) {
                            console.log(`Found ATMS1 column: ${header} at index ${index}`);
                            return index;
                        }
                    }
                    return -1;
                })
                .filter(index => index !== -1);

            console.log('Final ATMS1 column indices:', amts1Columns);

            if (amts1Columns.length === 0) {
                console.warn('No ATMS1 columns found! Available headers:', headers);
                setTimeColumn([]);
                return;
            }

            const timeValues = processedData
                .slice(1)
                .filter(row =>
                    amts1Columns.some(colIndex => {
                        const val = row[colIndex];
                        const isValid = val !== null &&
                            val !== undefined &&
                            val !== '' &&
                            !isNaN(Number(val));
                        if (!isValid) {

                        }
                        return isValid;
                    })
                )
                .map(row => {
                    const timeVal = row[0];
                    return timeVal?.toString().trim() || '';
                })
                .filter(Boolean);

            setTimeColumn(timeValues);
        } else {
            console.warn('Not enough processed data');
            setTimeColumn([]);
        }
    }, [processedData]);

    const handleColumnSelect = () => {
        if (!selectedRowTime1 || !selectedTrkColOption || !selectedTrk) return;

        const timeIndex = headers.indexOf("Time");
        const selectedRow = processedData.find(row => row[timeIndex] === selectedRowTime1);
        if (!selectedRow) return;

        // const isTrack3 = headers.some(h => h.includes('LBN-TP-TK3'));
        const prismSize = selectedTrk === "LBN-TP-TK-2" ? amsts_track2_prism_size : amts_track3_prism_size;
        const startDistance = selectedTrk === "LBN-TP-TK-2" ? amts_track2_start_distance : amts_track3_start_distance;
        const amts2StartDistance = selectedTrk === "LBN-TP-TK-2" ? amts2_track2_start_distance : amts2_track3_start_distance;

        // AMTS-1 Data (unchanged)
        const amtsColPrefix = `LBN-AMTS-1 - ${selectedTrkColOption}`;
        const amtsColIndex = headers.indexOf(amtsColPrefix);
        const amtsValue = selectedRow[amtsColIndex];

        // AMTS-2 Data
        const amts2ColPrefix = `LBN-AMTS-2 - ${selectedTrkColOption}`;
        const amts2ColIndex = headers.indexOf(amts2ColPrefix);
        const amts2Value = amts2ColIndex !== -1 ? Number(selectedRow[amts2ColIndex]) : null;

        // Correct prism numbering for AMTS-2
        const amts2StartPrism = selectedTrk === "LBN-TP-TK-2" ? 17 : 7; // 1 for Track2, 7 for Track3
        // const amts2StartPrism = isTrack3 ? 7 : 17;  // 7 for Track3, 17 for Track2
        const amts2EndPrism = 32;

        // Find available prisms in the correct range
        const availablePrisms: number[] = [];
        for (let i = amts2StartPrism; i <= amts2EndPrism; i++) {
            const prismNum = i.toString().padStart(2, '0');
            // const prismACol = `LBN-TP-TK${isTrack3 ? '3' : '2'}-${prismNum}A - ${selectedTrkColOption}`;
            const prismACol = `LBN-TP-TK${selectedTrk === "LBN-TP-TK-2" ? '2' : '3'}-${prismNum}A - ${selectedTrkColOption}`;
            if (headers.includes(prismACol)) {
                availablePrisms.push(i);
            }
        }

        const chartData = [];
        const amts2ChartData: { x: number; amtsValue: null; amts2Value: null; prismA: number | null; prismB: number | null; prismAColName: string; prismBColName: string; time: string; }[] = [];

        // Add prism data points for AMTS-1 (unchanged)
        for (let i = 1; i <= prismSize; i++) {
            const prismNumber = i.toString().padStart(2, '0');
            const xPos = startDistance + (i - 1) * amts_offset;

            // const prismACol = `LBN-TP-TK${isTrack3 ? '3' : '2'}-${prismNumber}A - ${selectedTrkColOption}`;
            const prismACol = `LBN-TP-TK${selectedTrk === "LBN-TP-TK-2" ? '2' : '3'}-${prismNumber}A - ${selectedTrkColOption}`;
            const prismAIndex = headers.indexOf(prismACol);
            const prismAValue = prismAIndex !== -1 ? Number(selectedRow[prismAIndex]) : null;

            // const prismBCol = `LBN-TP-TK${isTrack3 ? '3' : '2'}-${prismNumber}B - ${selectedTrkColOption}`;
            const prismBCol = `LBN-TP-TK${selectedTrk === "LBN-TP-TK-2" ? '2' : '3'}-${prismNumber}B - ${selectedTrkColOption}`;
            const prismBIndex = headers.indexOf(prismBCol);
            const prismBValue = prismBIndex !== -1 ? Number(selectedRow[prismBIndex]) : null;

            chartData.push({
                x: xPos,
                amtsValue: null,
                prismA: prismAValue,
                prismB: prismBValue,
                prismAColName: prismACol,
                prismBColName: prismBCol,
                time: selectedRowTime1
            });
        }

        // Add prism data points for AMTS-2 (with correct numbering)
        availablePrisms.forEach((prismNum, index) => {
            const prismNumber = prismNum.toString().padStart(2, '0');
            const xPos = amts2StartDistance + (index * amts_offset);

            // const prismACol = `LBN-TP-TK${isTrack3 ? '3' : '2'}-${prismNumber}A - ${selectedTrkColOption}`;
            const prismACol = `LBN-TP-TK${selectedTrk === "LBN-TP-TK-2" ? '2' : '3'}-${prismNumber}A - ${selectedTrkColOption}`;
            const prismAIndex = headers.indexOf(prismACol);
            const prismAValue = prismAIndex !== -1 ? Number(selectedRow[prismAIndex]) : null;

            // const prismBCol = `LBN-TP-TK${isTrack3 ? '3' : '2'}-${prismNumber}B - ${selectedTrkColOption}`;
            const prismBCol = `LBN-TP-TK${selectedTrk === "LBN-TP-TK-2" ? '2' : '3'}-${prismNumber}B - ${selectedTrkColOption}`;
            const prismBIndex = headers.indexOf(prismBCol);
            const prismBValue = prismBIndex !== -1 ? Number(selectedRow[prismBIndex]) : null;

            amts2ChartData.push({
                x: xPos,
                amtsValue: null,
                amts2Value: null,
                prismA: prismAValue,
                prismB: prismBValue,
                prismAColName: prismACol,
                prismBColName: prismBCol,
                time: selectedRowTime1
            });
        });

        // Set AMTS-1 graph data (unchanged)
        setCombinedGraphData([
            {
                x: 0,
                amtsValue: Number(amtsValue),
                prismA: null,
                prismB: null,
                prismAColName: null,
                prismBColName: null,
                amtsColName: amtsColPrefix,
                time: selectedRowTime1
            },
            ...chartData.filter(item => item.prismA !== null || item.prismB !== null)
        ]);

        // Set AMTS-2 graph data
        setAmts2CombinedGraphData([
            {
                x: 0,
                amtsValue: Number(amtsValue),
                amts2Value: amts2Value !== null ? Number(amts2Value) : null,
                prismA: null,
                prismB: null,
                prismAColName: null,
                prismBColName: null,
                amtsColName: amtsColPrefix,
                amts2ColName: amts2ColPrefix,
                time: selectedRowTime1
            },
            ...amts2ChartData.filter(item => item.prismA !== null || item.prismB !== null)
        ]);

        // Set domains
        const xValues = chartData.map(item => item.x);
        setXDomain([-50, Math.max(...xValues, 50) + 10]);

        const amts2XValues = amts2ChartData.map(item => item.x);
        setAmtsXDomain([
            Math.min(...amts2XValues, amts2StartDistance) - 10,
            Math.max(...amts2XValues, 50) + 10
        ]);
    };
    console.log("Combined Graph Data:", combinedGraphData);
    console.log("AMTS-2 Combined Graph Data:", Amts2combinedGraphData);

    const handleDownloadGraph = () => {
        const chartContainer = document.getElementById("chartContainer");
        if (chartContainer) {
            html2canvas(chartContainer).then((canvas) => {
                canvas.toBlob((blob) => {
                    if (blob) {
                        saveAs(blob, "graphs.png");
                    }
                });
            });
        }
    };
    const generateTicks = (min: number, max: number) => {
        const range = max - min;
        const approxSteps = 10;
        const step = range / approxSteps;

        const ticks = [];
        for (let i = min; i <= max + 1e-9; i += step) {
            ticks.push(Number(i.toFixed(2)));
        }
        return ticks;
    };
    // useEffect(() => {
    //     if (processedData && processedData.length > 0) {
    //         let allValues: number[] = [];

    //         processedData.forEach(row => {
    //             const values = row.slice(1); 
    //             values.forEach(val => {
    //                 const num = parseFloat(val);
    //                 if (!isNaN(num)) {
    //                     allValues.push(num);
    //                 }
    //             });
    //         });

    //         if (allValues.length > 0) {
    //             const min = Math.min(...allValues);
    //             const max = Math.max(...allValues);
    //             setYDomain([min, max]);
    //         }
    //     }

    // }, [processedData]);
    // console.log(yDomain);


    return (

        <>
            <HeaNavLogo />
            <MainContentWrapper>
                <TrackMerger onMergeSave={handleMergeClick} />
                <div
                    style={{
                        // padding: '2rem',
                        display: "flex",
                        flexDirection: "column",
                        gap: "1.5rem",
                        backgroundColor: "#f4f7fa",
                        minHeight: "100vh",
                        fontFamily: "'Inter', sans-serif",
                        border: "4px solid black",
                        margin: "10px",
                        padding: "10px",
                    }}
                >
                    <button
                        onClick={handleProcess}
                        ref={processSaveRef}
                        style={{
                            display: "none",
                            backgroundColor: "#2563eb",
                            color: "#ffffff",
                            padding: "0.75rem 1.5rem",
                            borderRadius: "0.375rem",
                            fontWeight: "500",
                            cursor: "pointer",
                            transition: "background-color 0.2s ease, transform 0.1s ease",
                            border: "none",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                        }}
                        onMouseOver={(e) =>
                            (e.currentTarget.style.backgroundColor = "#1d4ed8")
                        }
                        onMouseOut={(e) =>
                            (e.currentTarget.style.backgroundColor = "#2563eb")
                        }
                        onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
                        onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                    >
                        Process & Show Graph
                    </button>

                    {processedBlob && (
                        <button
                            onClick={handleDownload}
                            style={{
                                backgroundColor: "#16a34a",
                                color: "#ffffff",
                                padding: "0.75rem 1.5rem",
                                borderRadius: "0.375rem",
                                fontWeight: "500",
                                cursor: "pointer",
                                transition: "background-color 0.2s ease, transform 0.1s ease",
                                border: "none",
                                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                            }}
                            onMouseOver={(e) =>
                                (e.currentTarget.style.backgroundColor = "#15803d")
                            }
                            onMouseOut={(e) =>
                                (e.currentTarget.style.backgroundColor = "#16a34a")
                            }
                            onMouseDown={(e) =>
                                (e.currentTarget.style.transform = "scale(0.98)")
                            }
                            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                        >
                            Download Final File
                        </button>
                    )}
                    {showGraph && (
                        <div
                            style={{
                                padding: "2rem",
                                backgroundColor: "#ffffff",
                                borderRadius: "0.5rem",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                                marginTop: "1rem",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "1rem",
                                    marginBottom: "1rem",
                                }}
                            >
                                <label
                                    style={{
                                        fontWeight: "600",
                                        color: "#1f2937",
                                        fontSize: "0.9rem",
                                    }}
                                >
                                    Select Track 2/3:
                                </label>
                                <select
                                    value={selectedTrk}
                                    onChange={(e) => setSelectedTrk(e.target.value)}
                                    style={{
                                        border: "1px solid #d1d5db",
                                        borderRadius: "0.375rem",
                                        padding: "0.5rem",
                                        fontSize: "0.875rem",
                                        color: "#374151",
                                        backgroundColor: "#f9fafb",
                                        outline: "none",
                                        transition: "border-color 0.2s ease",
                                        width: "200px",
                                    }}
                                    onFocus={(e) => (e.currentTarget.style.borderColor = "#2563eb")}
                                    onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")}
                                >
                                    <option value="placeholder" disabled>
                                        Select a track
                                    </option>
                                    <option value="LBN-TP-TK-2">LBN-TP-TK-2</option>
                                    <option value="LBN-TP-TK-3">LBN-TP-TK-3</option>

                                </select>
                                <label
                                    style={{
                                        fontWeight: "600",
                                        color: "#1f2937",
                                        fontSize: "0.9rem",
                                    }}
                                >
                                    Select Time for AMTS:
                                </label>
                                <select
                                    value={selectedRowTime1}
                                    onChange={(e) => setSelectedRowTime1(e.target.value)}
                                    style={{
                                        border: "1px solid #d1d5db",
                                        borderRadius: "0.375rem",
                                        padding: "0.5rem",
                                        fontSize: "0.875rem",
                                        color: "#374151",
                                        backgroundColor: "#f9fafb",
                                        outline: "none",
                                        transition: "border-color 0.2s ease",
                                        width: "200px",
                                    }}
                                    onFocus={(e) => (e.currentTarget.style.borderColor = "#2563eb")}
                                    onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")}
                                >
                                    <option value="placeholder" disabled>
                                        Select a timestamp
                                    </option>
                                    {timeColumn.map((header, index) => (
                                        <option key={index} value={header}>
                                            {header}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={selectedTrkColOption}
                                    onChange={(e) => setSelectedTrkColOption(e.target.value)}
                                    style={{
                                        border: "1px solid #d1d5db",
                                        borderRadius: "0.375rem",
                                        padding: "0.5rem",
                                        fontSize: "0.875rem",
                                        color: "#374151",
                                        backgroundColor: "#f9fafb",
                                        outline: "none",
                                        transition: "border-color 0.2s ease",
                                        width: "200px",
                                    }}
                                    onFocus={(e) => (e.currentTarget.style.borderColor = "#2563eb")}
                                    onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")}
                                >
                                    <option value="placeholder" disabled>
                                        Select Easting/Northing/Height
                                    </option>
                                    {selectedTrkColOptions.map((header, index) => (
                                        <option key={index} value={header}>
                                            {header}
                                        </option>
                                    ))}

                                </select>

                            </div>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "1rem",
                                    marginTop: "1rem",
                                }}
                            >
                                <label
                                    style={{
                                        fontWeight: "600",
                                        color: "#1f2937",
                                        fontSize: "0.9rem",
                                    }}
                                >
                                    X Scale:
                                </label>
                                <input
                                    type="number"
                                    value={xScale}
                                    onChange={(e) => setXScale(Number(e.target.value))}
                                    style={{
                                        border: "1px solid #d1d5db",
                                        borderRadius: "0.375rem",
                                        padding: "0.5rem",
                                        fontSize: "0.875rem",
                                        color: "#374151",
                                        backgroundColor: "#f9fafb",
                                        outline: "none",
                                        width: "100px",
                                        transition: "border-color 0.2s ease",
                                    }}
                                    min="0.1"
                                    max="1.4"
                                    step="0.1"
                                    onFocus={(e) => (e.currentTarget.style.borderColor = "#2563eb")}
                                    onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")}
                                />
                                <label
                                    style={{
                                        fontWeight: "600",
                                        color: "#1f2937",
                                        fontSize: "0.9rem",
                                        marginLeft: "1rem",
                                    }}
                                >
                                    Y Scale:
                                </label>
                                <input
                                    type="number"
                                    value={yScale}
                                    onChange={(e) => {
                                        const val = Math.max(0.1, Number(e.target.value));
                                        setYScale(val);
                                    }}
                                    style={{
                                        border: "1px solid #d1d5db",
                                        borderRadius: "0.375rem",
                                        padding: "0.5rem",
                                        fontSize: "0.875rem",
                                        color: "#374151",
                                        backgroundColor: "#f9fafb",
                                        outline: "none",
                                        width: "100px",
                                        transition: "border-color 0.2s ease",
                                    }}
                                    min="0.2"
                                    step="0.1"
                                    max="5.0"
                                    onFocus={(e) => (e.currentTarget.style.borderColor = "#2563eb")}
                                    onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")}
                                />
                            </div>
                            <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
                                <button
                                    onClick={handleColumnSelect}
                                    style={{
                                        backgroundColor: "#2563eb",
                                        color: "#ffffff",
                                        padding: "0.75rem 1.5rem",
                                        borderRadius: "0.375rem",
                                        fontWeight: "500",
                                        cursor: "pointer",
                                        transition: "background-color 0.2s ease, transform 0.1s ease",
                                        border: "none",
                                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                                    }}
                                    onMouseOver={(e) =>
                                        (e.currentTarget.style.backgroundColor = "#1d4ed8")
                                    }
                                    onMouseOut={(e) =>
                                        (e.currentTarget.style.backgroundColor = "#2563eb")
                                    }
                                    onMouseDown={(e) =>
                                        (e.currentTarget.style.transform = "scale(0.98)")
                                    }
                                    onMouseUp={(e) =>
                                        (e.currentTarget.style.transform = "scale(1)")
                                    }
                                >
                                    Generate Graphs
                                </button>

                                <button
                                    onClick={handleDownloadGraph}
                                    style={{
                                        backgroundColor: "#7c3aed",
                                        color: "#ffffff",
                                        padding: "0.75rem 1.5rem",
                                        borderRadius: "0.375rem",
                                        fontWeight: "500",
                                        cursor: "pointer",
                                        transition: "background-color 0.2s ease, transform 0.1s ease",
                                        border: "none",
                                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                                    }}
                                    onMouseOver={(e) =>
                                        (e.currentTarget.style.backgroundColor = "#6d28d9")
                                    }
                                    onMouseOut={(e) =>
                                        (e.currentTarget.style.backgroundColor = "#7c3aed")
                                    }
                                    onMouseDown={(e) =>
                                        (e.currentTarget.style.transform = "scale(0.98)")
                                    }
                                    onMouseUp={(e) =>
                                        (e.currentTarget.style.transform = "scale(1)")
                                    }
                                >
                                    Download Graphs as Image
                                </button>
                            </div>
                            <div id="chartContainer" style={{ marginTop: "2rem" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                                    <h3 style={{ fontWeight: "700", fontSize: "1.25rem", color: "#1f2937", marginBottom: "1rem" }}>
                                        AMTS-1 GRAPH

                                    </h3>
                                    <Plot
                                        data={[
                                            // AMTS-1 line
                                            {
                                                x: combinedGraphData.map(item => item.x),
                                                y: combinedGraphData.map(item => item.amtsValue),
                                                type: 'scatter',
                                                mode: 'lines+markers',
                                                name: 'AMTS-1',
                                                line: {
                                                    color: '#ff0000',
                                                    width: 2,
                                                    shape: 'spline'
                                                },
                                                marker: {
                                                    size: 6,
                                                    color: '#ff0000',
                                                    line: { width: 0 }
                                                },
                                                hovertemplate: `
                <b>AMTS-1</b><br>
                Distance: %{x}<br>
                Value: %{y:.6f}<br>
                ${combinedGraphData[0]?.amtsColName ? `Column: ${combinedGraphData[0].amtsColName}<br>` : ''}
                Time: ${combinedGraphData[0]?.time || ''}
                <extra></extra>
            `,
                                                connectgaps: true
                                            },
                                            // Prism A line
                                            {
                                                x: combinedGraphData.map(item => item.x),
                                                y: combinedGraphData.map(item => item.prismA),
                                                type: 'scatter',
                                                mode: 'lines+markers',
                                                name: `${selectedTrk}-A-${selectedTrkColOption}`,
                                                line: {
                                                    color: '#8884d8',
                                                    width: 2,
                                                    shape: 'spline'
                                                },
                                                marker: {
                                                    size: 6,
                                                    color: '#8884d8',
                                                    line: { width: 0 }
                                                },
                                                hovertemplate: combinedGraphData.map(item => `
                Distance: ${item.x}<br>
                Value: ${item.prismA?.toFixed(6) || 'N/A'}<br>
                ${item.prismAColName ? `Column: ${item.prismAColName}<br>` : ''}
                Time: ${item.time || ''}
                <extra></extra>
            `),
                                                connectgaps: true
                                            },
                                            // Prism B line
                                            {
                                                x: combinedGraphData.map(item => item.x),
                                                y: combinedGraphData.map(item => item.prismB),
                                                type: 'scatter',
                                                mode: 'lines+markers',
                                                name: `${selectedTrk}-B-${selectedTrkColOption}`,
                                                line: {
                                                    color: '#82ca9d',
                                                    width: 2,
                                                    shape: 'spline'
                                                },
                                                marker: {
                                                    size: 6,
                                                    color: '#82ca9d',
                                                    line: { width: 0 }
                                                },
                                                hovertemplate: combinedGraphData.map(item => `
                Distance: ${item.x}<br>
                Value: ${item.prismB?.toFixed(6) || 'N/A'}<br>
                ${item.prismBColName ? `Column: ${item.prismBColName}<br>` : ''}
                Time: ${item.time || ''}
                <extra></extra>
            `),
                                                connectgaps: true
                                            }
                                        ]}
                                        layout={{
                                            width: 800 * xScale,
                                            height: 500,
                                            margin: { l: 80, r: 30, b: 100, t: 30, pad: 4 },

                                            xaxis: {
                                                title: { text: 'Distance' },
                                                type: 'linear',
                                                tickmode: 'auto',
                                                nticks: 10,
                                                gridcolor: '#f0f0f0',
                                                automargin: true,
                                                showgrid: true,
                                                range: xDomain
                                            },
                                            yaxis: {
                                                title: {
                                                    text: 'Movement (inches)',
                                                    standoff: 20,
                                                    font: {
                                                        size: 12,
                                                        color: '#333'
                                                    }
                                                },
                                                range: [-0.5 / yScale, 0.5 / yScale],
                                                tickvals: generateTicks(-0.5 / yScale, 0.5 / yScale),
                                                gridcolor: '#f0f0f0',
                                                zeroline: true,
                                                zerolinecolor: '#f0f0f0',
                                                // title_standoff: 30,
                                                automargin: true
                                            },
                                            legend: {
                                                orientation: 'h',
                                                y: -0.3,
                                                x: 0.5,
                                                xanchor: 'center'
                                            },
                                            plot_bgcolor: 'white',
                                            paper_bgcolor: 'white',
                                            hovermode: 'x unified',
                                            shapes,
                                            annotations,
                                        }}
                                        config={{
                                            displayModeBar: true,
                                            responsive: true,
                                            displaylogo: false,
                                            scrollZoom: true,
                                        }}
                                        style={{ maxHeight: '800px', width: '100%' }}
                                    />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                                    <h3 style={{ fontWeight: "700", fontSize: "1.25rem", color: "#1f2937", marginBottom: "1rem" }}>
                                        AMTS-2 GRAPH

                                    </h3>
                                    <Plot
                                        data={[
                                            // AMTS-1 line
                                            {
                                                x: Amts2combinedGraphData.map(item => item.x),
                                                y: Amts2combinedGraphData.map(item => item.amtsValue),
                                                type: 'scatter',
                                                mode: 'lines+markers',
                                                name: 'AMTS-1',
                                                line: {
                                                    color: '#ff0000',
                                                    width: 2,
                                                    shape: 'spline'
                                                },
                                                marker: {
                                                    size: 6,
                                                    color: '#ff0000'
                                                },
                                                hovertemplate: `
        <b>AMTS-1</b><br>
        Distance: %{x}<br>
        Value: %{y:.6f}<extra></extra>
      `,
                                                connectgaps: true
                                            },
                                            // AMTS-2 line
                                            {
                                                x: Amts2combinedGraphData.map(item => item.x),
                                                y: Amts2combinedGraphData.map(item => item.amts2Value),
                                                type: 'scatter',
                                                mode: 'lines+markers',
                                                name: 'AMTS-2',
                                                line: {
                                                    color: '#ff6600',
                                                    width: 2,
                                                    shape: 'spline'
                                                },
                                                marker: {
                                                    size: 6,
                                                    color: '#ff6600'
                                                },
                                                hovertemplate: `
        <b>AMTS-2</b><br>
        Distance: %{x}<br>
        Value: %{y:.6f}<extra></extra>
      `,
                                                connectgaps: true
                                            },
                                            // Prism A line
                                            {
                                                x: Amts2combinedGraphData.map(item => item.x),
                                                y: Amts2combinedGraphData.map(item => item.prismA),
                                                type: 'scatter',
                                                mode: 'lines+markers',
                                                name: 'Prism A',
                                                line: {
                                                    color: '#8884d8',
                                                    width: 2,
                                                    shape: 'spline'
                                                },
                                                marker: {
                                                    size: 6,
                                                    color: '#8884d8'
                                                },
                                                hovertemplate: `
        <b>Prism A</b><br>
        Distance: %{x}<br>
        Value: %{y:.6f}<extra></extra>
      `,
                                                connectgaps: true
                                            },
                                            // Prism B line
                                            {
                                                x: Amts2combinedGraphData.map(item => item.x),
                                                y: Amts2combinedGraphData.map(item => item.prismB),
                                                type: 'scatter',
                                                mode: 'lines+markers',
                                                name: 'Prism B',
                                                line: {
                                                    color: '#82ca9d',
                                                    width: 2,
                                                    shape: 'spline'
                                                },
                                                marker: {
                                                    size: 6,
                                                    color: '#82ca9d'
                                                },
                                                hovertemplate: `
        <b>Prism B</b><br>
        Distance: %{x}<br>
        Value: %{y:.6f}<extra></extra>
      `,
                                                connectgaps: true
                                            }
                                        ]}
                                        layout={{
                                            width: 800 * xScale,
                                            height: 500,
                                            margin: { l: 80, r: 30, b: 100, t: 30, pad: 4 }, // Increased left margin for y-axis label
                                            xaxis: {
                                                title: { text: 'Distance' },
                                                type: 'linear',
                                                tickmode: 'auto',
                                                nticks: 10,
                                                gridcolor: '#f0f0f0',
                                                automargin: true,
                                                showgrid: true,
                                                range: AmtsxDomain
                                            },
                                            yaxis: {
                                                title: {
                                                    text: 'Movement (inches)',
                                                    standoff: 20,
                                                    font: {
                                                        size: 12,
                                                        color: '#333'
                                                    }
                                                },
                                                range: [-0.5 / yScale, 0.5 / yScale],
                                                tickvals: generateTicks(-0.5 / yScale, 0.5 / yScale),
                                                gridcolor: '#f0f0f0',
                                                zeroline: true,
                                                zerolinecolor: '#f0f0f0',
                                                //   title_standoff: 30,
                                                automargin: true
                                            },
                                            legend: {
                                                orientation: 'h',
                                                y: -0.3,
                                                x: 0.5,
                                                xanchor: 'center'
                                            },
                                            plot_bgcolor: 'white',
                                            paper_bgcolor: 'white',
                                            hovermode: 'x unified',
                                            shapes: shapesForAmts2,
                                            annotations: annotationsForAmts2
                                        }}
                                        config={{
                                            displayModeBar: true,
                                            responsive: true,
                                            displaylogo: false,
                                            scrollZoom: true
                                        }}
                                        style={{ maxHeight: '800px', width: '100%' }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </MainContentWrapper>


        </>
    );
}

export default AtmsTrackGraphs;