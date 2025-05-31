import React, { useEffect, useMemo, useRef } from 'react';
import * as XLSX from "xlsx";
import MainContentWrapper from '../components/MainContentWrapper';
import HeaNavLogo from '../components/HeaNavLogo';
import excelFile from '../assets/files/track-files-and-amts.xlsx?url';
import TrackMerger from '../components/MergeATMSTracks';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { toast } from 'react-toastify';
const LongBridgeDataSummary: React.FC = () => {
    const [processedData, setProcessedData] = React.useState<any[]>([]);
    const [headers, setHeaders] = React.useState<string[]>([]);
    const [lessthanValue, setLessThanValue] = React.useState<number | null>(null);
    const [greaterthanValue, setGreaterThanValue] = React.useState<number | null>(null);
    const [showSummary, setShowSummary] = React.useState(false);
    const processSaveRef = useRef<HTMLButtonElement>(null);

    const handleNumberChange = (
        e: React.ChangeEvent<HTMLInputElement>,
        setter: React.Dispatch<React.SetStateAction<number | null>>
    ) => {
        const value = e.target.value;
        if (value === '') {
            setter(null);
        } else if (!isNaN(Number(value))) {
            setter(Number(value));
        }
    };

    const handleMergeClick = () => {
        processSaveRef.current?.click();
    };

    useEffect(() => {
        const loadAndProcessExcel = async () => {
            try {
                const fileData = localStorage.getItem("mergedExcelFile") || excelFile;
                const response = await fetch(fileData);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const arrayBuffer = await response.arrayBuffer();
                const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                const headers = jsonData[0] as string[];
                setProcessedData(jsonData.slice(1));
                setHeaders(headers);
            } catch (error) {
                console.error('Error:', error);
            }
        };
        loadAndProcessExcel();
    }, []);

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


        const tk2StartIndex = 1;
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

        localStorage.setItem("mergedExcelFile", JSON.stringify(blob));
        localStorage.setItem("processedHeaders", JSON.stringify(newHeader));
        localStorage.setItem("processedData", JSON.stringify(result));
        setHeaders(newHeader as string[]);
        setProcessedData(result as string[][]);
    };

    const generateTableData = (track: 'TK2' | 'TK3', range: { start: number, end: number }, types: string[]) => {
        if (!processedData.length || !headers.length) return [];

        const results: {
            measurementType: string;
            totalPoints: number;
            lessThanCount: number;
            lessThanPercent: string;
            greaterThanCount: number;
            greaterThanPercent: string;
            avgPositive: string;
            avgNegative: string;
        }[] = [];

        types.forEach(type => {
            const aValues: number[] = [];
            const bValues: number[] = [];

            for (let i = range.start; i <= range.end; i++) {
                const prismA = `LBN-TP-${track}-${i.toString().padStart(2, '0')}A - ${type}`;
                const prismB = `LBN-TP-${track}-${i.toString().padStart(2, '0')}B - ${type}`;

                // Process A series
                const aColIndex = headers.indexOf(prismA);
                if (aColIndex !== -1) {
                    const values = processedData
                        .map(row => row[aColIndex])
                        .filter(val => val !== undefined && val !== null && val !== 0 && val !== '')
                        .map(Number);
                    aValues.push(...values);
                }

                // Process B series
                const bColIndex = headers.indexOf(prismB);
                if (bColIndex !== -1) {
                    const values = processedData
                        .map(row => row[bColIndex])
                        .filter(val => val !== undefined && val !== null && val !== 0 && val !== '')
                        .map(Number);
                    bValues.push(...values);
                }
            }

            // Helper function to calculate stats
            const calculateStats = (values: number[], series: string) => {
                const totalPoints = values.length;
                const lessThanCount = lessthanValue !== null ? values.filter(val => val < lessthanValue).length : 0;
                const greaterThanCount = greaterthanValue !== null ? values.filter(val => val > greaterthanValue).length : 0;

                const lessThanPercent = totalPoints > 0 ? (lessThanCount / totalPoints * 100).toFixed(2) : '0.00';
                const greaterThanPercent = totalPoints > 0 ? (greaterThanCount / totalPoints * 100).toFixed(2) : '0.00';

                const positiveValues = values.filter(val => val > 0);
                const negativeValues = values.filter(val => val < 0);

                const avgPositive = positiveValues.length > 0
                    ? (positiveValues.reduce((a, b) => a + b, 0) / positiveValues.length).toFixed(4)
                    : 'N/A';
                const avgNegative = negativeValues.length > 0
                    ? (negativeValues.reduce((a, b) => a + b, 0) / negativeValues.length).toFixed(4)
                    : 'N/A';

                return {
                    measurementType: `${track}-${series} ${type}`,
                    totalPoints,
                    lessThanCount,
                    lessThanPercent,
                    greaterThanCount,
                    greaterThanPercent,
                    avgPositive,
                    avgNegative
                };
            };
            if (aValues.length > 0) results.push(calculateStats(aValues, 'A'));
            if (bValues.length > 0) results.push(calculateStats(bValues, 'B'));
        });

        return results;
    };
    const allPrismsDataTK2 = useMemo(() => {
        const measurementTypes = ['Easting', 'Northing', 'Height'];
        return generateTableData('TK2', { start: 1, end: 33 }, measurementTypes);
    }, [processedData, headers, lessthanValue, greaterthanValue]);

    const ohioBridgeDataTK2 = useMemo(() => {
        const measurementTypes = ['Easting', 'Northing', 'Height'];
        return generateTableData('TK2', { start: 7, end: 11 }, measurementTypes);
    }, [processedData, headers, lessthanValue, greaterthanValue]);

    const track2Prisms12to22Data = useMemo(() => {
        const measurementTypes = ['Easting', 'Northing', 'Height'];
        return generateTableData('TK2', { start: 12, end: 22 }, measurementTypes);
    }, [processedData, headers, lessthanValue, greaterthanValue]);

    const washingtonChannelDataTK2 = useMemo(() => {
        const measurementTypes = ['Easting', 'Northing', 'Height'];
        return generateTableData('TK2', { start: 23, end: 28 }, measurementTypes);
    }, [processedData, headers, lessthanValue, greaterthanValue]);
    const allPrismsDataTK3 = useMemo(() => {
        const measurementTypes = ['Easting', 'Northing', 'Height'];
        return generateTableData('TK3', { start: 1, end: 33 }, measurementTypes);
    }, [processedData, headers, lessthanValue, greaterthanValue]);

    const ohioBridgeDataTK3 = useMemo(() => {
        const measurementTypes = ['Easting', 'Northing', 'Height'];
        return generateTableData('TK3', { start: 7, end: 11 }, measurementTypes);
    }, [processedData, headers, lessthanValue, greaterthanValue]);

    const track3Prisms12to22Data = useMemo(() => {
        const measurementTypes = ['Easting', 'Northing', 'Height'];
        return generateTableData('TK3', { start: 12, end: 22 }, measurementTypes);
    }, [processedData, headers, lessthanValue, greaterthanValue]);

    const washingtonChannelDataTK3 = useMemo(() => {
        const measurementTypes = ['Easting', 'Northing', 'Height'];
        return generateTableData('TK3', { start: 23, end: 28 }, measurementTypes);
    }, [processedData, headers, lessthanValue, greaterthanValue]);



    const handleGenerateSummary = () => {
        if (lessthanValue === null && greaterthanValue === null) {
            alert("Please enter at least one comparison value");
            return;
        }
        setShowSummary(true);
    };
    const exportToPDF = () => {
        toast.info('Downloading PDF...');
        const element = document.getElementById('pdf-content');

        if (!element) {
            alert('Content not found');
            return;
        }
        window.scrollTo(0, 0);
        setTimeout(() => {
            const opt = {
                margin: 0.3,
                filename: 'Data_Summary_Output.pdf',
                image: { type: 'jpeg', quality: 1 },
                html2canvas: {
                    scale: 2,
                    scrollY: 0,
                },
                jsPDF: {
                    unit: 'in',
                    format: 'letter',
                    orientation: 'portrait',
                },
            };
            // @ts-ignore
            window.html2pdf().set(opt).from(element).save();
        }, 300);


    }
    const exportCompletenessToPDF = () => {
        toast.info('Downloading Completeness PDF...');
        const element = document.getElementById('completeness-pdf-content');

        if (!element) {
            alert('Completeness content not found');
            return;
        }

        window.scrollTo(0, 0);
        setTimeout(() => {
            const opt = {
                margin: 0.3,
                filename: 'Data_Completeness_Summary.pdf',
                image: { type: 'jpeg', quality: 1 },
                html2canvas: {
                    scale: 2,
                    scrollY: 0,
                },
                jsPDF: {
                    unit: 'in',
                    format: 'letter',
                    orientation: 'landscape', // Use landscape for better table fit
                },
            };
            // @ts-ignore
            window.html2pdf().set(opt).from(element).save();
        }, 300);
    };

    const generateTimeBasedCompletenessTable = () => {
        if (!processedData.length || !headers.length) return [];

        const times = processedData
            .map(row => row[0])
            .filter((time, index, self) => time && self.indexOf(time) === index);
        const measurementTypes = ['Easting', 'Northing', 'Height'];

        const trackPrismCombinations = [
            { track: 'TK2', prism: 'A' },
            { track: 'TK2', prism: 'B' },
            { track: 'TK3', prism: 'A' },
            { track: 'TK3', prism: 'B' }
        ];

        return times.map(time => {
            const rowData: any = { time };

            const rowIndex = processedData.findIndex(row => row[0] === time);
            if (rowIndex === -1) return rowData;

            trackPrismCombinations.forEach(({ track, prism }) => {
                let totalPoints = 0;
                let missingPoints = 0;
                const missingPrisms: number[] = [];

                measurementTypes.forEach(type => {
                    for (let i = 1; i <= 33; i++) {
                        const prismCol = `LBN-TP-${track}-${i.toString().padStart(2, '0')}${prism} - ${type}`;
                        const colIndex = headers.indexOf(prismCol);

                        if (colIndex !== -1) {
                            totalPoints++;
                            const value = processedData[rowIndex][colIndex];
                            if (value === undefined || value === null || value === '' || value === 0) {
                                missingPoints++;
                                if (!missingPrisms.includes(i)) {
                                    missingPrisms.push(i);
                                }
                            }
                        }
                    }
                });

                // Sort missing prisms numerically
                missingPrisms.sort((a, b) => a - b);

                rowData[`${track}-${prism}`] = {
                    totalPoints,
                    missingPoints,
                    missingPrisms: missingPrisms.length > 0
                        ? missingPrisms.join(', ')
                        : 'None'
                };
            });

            return rowData;
        });
    };

    const TimeBasedCompletenessTable = ({ data }: { data: any[] }) => {
        if (!data.length) return null;

        const trackPrismCombinations = ['TK2-A', 'TK2-B', 'TK3-A', 'TK3-B'];

        return (
            <div style={{
                marginTop: '30px',
                overflowX: 'auto',
                pageBreakInside: 'avoid' // Prevent page breaks inside the table
            }}>
                <h2 style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    marginBottom: '15px',
                    pageBreakAfter: 'avoid' // Keep header with table
                }}>
                    Data Completeness by Time
                </h2>
                <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    boxShadow: '0 0 10px rgba(0,0,0,0.1)',
                    marginBottom: '30px',
                    pageBreakInside: 'avoid',
                    fontSize: '12px' // Smaller font for better fit
                }}>
                    <thead>
                        <tr style={{ backgroundColor: '#2563eb', color: 'white' }}>
                            <th style={{ padding: '12px', textAlign: 'left' }}>Time</th>
                            {trackPrismCombinations.map(comb => (
                                <th key={comb} colSpan={3} style={{ padding: '12px', textAlign: 'center' }}>
                                    {comb}
                                </th>
                            ))}
                        </tr>
                        <tr style={{ backgroundColor: '#3b82f6', color: 'white' }}>
                            <th></th>
                            {trackPrismCombinations.map(comb => (
                                <React.Fragment key={comb}>
                                    <th style={{ padding: '12px', textAlign: 'left' }}>Total</th>
                                    <th style={{ padding: '12px', textAlign: 'left' }}>Missing</th>
                                    <th style={{ padding: '12px', textAlign: 'left' }}>Missing Prisms</th>
                                </React.Fragment>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, index) => (
                            <tr
                                key={index}
                                style={{
                                    borderBottom: '1px solid #ddd',
                                    backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white'
                                }}
                            >
                                <td style={{ padding: '12px' }}>{row.time}</td>
                                {trackPrismCombinations.map(comb => (
                                    <React.Fragment key={comb}>
                                        <td style={{ padding: '12px' }}>{row[comb]?.totalPoints || 0}</td>
                                        <td style={{ padding: '12px' }}>{row[comb]?.missingPoints || 0}</td>
                                        <td style={{
                                            padding: '12px',
                                            color: row[comb]?.missingPrisms !== 'None' ? 'red' : 'green'
                                        }}>
                                            {row[comb]?.missingPrisms || 'None'}
                                        </td>
                                    </React.Fragment>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };
    const TimeBasedCompletenessSummary = () => {
        const completenessData = useMemo(() => generateTimeBasedCompletenessTable(),
            [processedData, headers]);

        return <TimeBasedCompletenessTable data={completenessData} />;
    };



    const DataTable = ({ title, data }: { title: string, data: any[] }) => {
        if (!data.length) return null;

        return (
            <div style={{ marginTop: '30px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '15px' }}>
                    {title}
                </h2>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        boxShadow: '0 0 10px rgba(0,0,0,0.1)',
                        marginBottom: '30px'
                    }}>
                        <thead>
                            <tr style={{ backgroundColor: '#2563eb', color: 'white' }}>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Measurement</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Data Points</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>{`< ${lessthanValue ?? 'N/A'}`}</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>% Less Than</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>{`> ${greaterthanValue ?? 'N/A'}`}</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>% Greater Than</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Avg +ve</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Avg -ve</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, index) => (
                                <tr
                                    key={index}
                                    style={{
                                        borderBottom: '1px solid #ddd',
                                        backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white'
                                    }}
                                >
                                    <td style={{ padding: '12px' }}>{row.measurementType}</td>
                                    <td style={{ padding: '12px' }}>{row.totalPoints}</td>
                                    <td style={{ padding: '12px' }}>{row.lessThanCount}</td>
                                    <td style={{ padding: '12px' }}>{row.lessThanPercent}%</td>
                                    <td style={{ padding: '12px' }}>{row.greaterThanCount}</td>
                                    <td style={{ padding: '12px' }}>{row.greaterThanPercent}%</td>
                                    <td style={{ padding: '12px' }}>{row.avgPositive}</td>
                                    <td style={{ padding: '12px' }}>{row.avgNegative}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // const exportToExcel = () => {
    //     const wb = XLSX.utils.book_new();

    //     const prepareWorksheet = (data: any[], title: string) => {
    //         const wsData = [
    //             // Header row
    //             ['Measurement', 'Data Points', `< ${lessthanValue ?? 'N/A'}`, '% Less Than',
    //                 `> ${greaterthanValue ?? 'N/A'}`, '% Greater Than', 'Avg +ve', 'Avg -ve'],
    //             // Data rows
    //             ...data.map(row => [
    //                 row.measurementType,
    //                 row.totalPoints,
    //                 row.lessThanCount,
    //                 row.lessThanPercent,
    //                 row.greaterThanCount,
    //                 row.greaterThanPercent,
    //                 row.avgPositive,
    //                 row.avgNegative
    //             ])
    //         ];
    //         console.log(title);
    //         return XLSX.utils.aoa_to_sheet(wsData);



    //     };

    //     XLSX.utils.book_append_sheet(wb, prepareWorksheet(allPrismsDataTK2, 'Track 2 All Prisms'), 'TK2 All Prisms');
    //     XLSX.utils.book_append_sheet(wb, prepareWorksheet(ohioBridgeDataTK2, 'Track 2 Ohio Bridge'), 'TK2 Ohio Bridge');
    //     XLSX.utils.book_append_sheet(wb, prepareWorksheet(track2Prisms12to22Data, 'Track 2 Prisms 12-22'), 'TK2 Prisms 12-22');
    //     XLSX.utils.book_append_sheet(wb, prepareWorksheet(washingtonChannelDataTK2, 'Track 2 Wash Channel'), 'TK2 Wash Channel');

    //     XLSX.utils.book_append_sheet(wb, prepareWorksheet(allPrismsDataTK3, 'Track 3 All Prisms'), 'TK3 All Prisms');
    //     XLSX.utils.book_append_sheet(wb, prepareWorksheet(ohioBridgeDataTK3, 'Track 3 Ohio Bridge'), 'TK3 Ohio Bridge');
    //     XLSX.utils.book_append_sheet(wb, prepareWorksheet(track3Prisms12to22Data, 'Track 3 Prisms 12-22'), 'TK3 Prisms 12-22');
    //     XLSX.utils.book_append_sheet(wb, prepareWorksheet(washingtonChannelDataTK3, 'Track 3 Wash Channel'), 'TK3 Wash Channel');

    //     XLSX.writeFile(wb, 'Data_Summary_Output.xlsx');
    // };

    return (
        <>
            <HeaNavLogo />

            <MainContentWrapper>
                <TrackMerger onMergeSave={handleMergeClick} />
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
                    Data Summary
                </h1>

                <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', alignItems: 'center' }}>
                    <label style={{ fontSize: '18px', fontWeight: 'bold' }}>
                        Less than value:
                    </label>
                    <input
                        type="number"
                        value={lessthanValue ?? ''}
                        onChange={(e) => handleNumberChange(e, setLessThanValue)}
                        style={{
                            padding: '10px',
                            fontSize: '16px',
                            borderRadius: '5px',
                            border: '1px solid #ccc',
                            width: '120px'
                        }}
                        placeholder="Enter value"
                        step="any"
                    />

                    <label style={{ fontSize: '18px', fontWeight: 'bold' }}>
                        Greater than value:
                    </label>
                    <input
                        type="number"
                        value={greaterthanValue ?? ''}
                        onChange={(e) => handleNumberChange(e, setGreaterThanValue)}
                        style={{
                            padding: '10px',
                            fontSize: '16px',
                            borderRadius: '5px',
                            border: '1px solid #ccc',
                            width: '120px'
                        }}
                        placeholder="Enter value"
                        step="any"
                    />

                    <div style={{ display: "flex", gap: "1rem", marginTop: "0" }}>
                        <button
                            onClick={handleGenerateSummary}
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
                            disabled={lessthanValue === null && greaterthanValue === null}
                        >
                            Generate Summary
                        </button>
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
                    </div>
                </div>

                {showSummary && (
                    <>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                        <button
                            onClick={exportToPDF}
                            style={{
                                backgroundColor: "#ef4444", // Red color
                                color: "#ffffff",
                                padding: "0.75rem 1.5rem",
                                borderRadius: "0.375rem",
                                fontWeight: "500",
                                cursor: "pointer",
                                transition: "background-color 0.2s ease, transform 0.1s ease",
                                border: "none",
                                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "0.5rem"
                            }}
                            onMouseOver={(e) =>
                                (e.currentTarget.style.backgroundColor = "#dc2626") // Darker red on hover
                            }
                            onMouseOut={(e) =>
                                (e.currentTarget.style.backgroundColor = "#ef4444")
                            }
                            onMouseDown={(e) =>
                                (e.currentTarget.style.transform = "scale(0.98)")
                            }
                            onMouseUp={(e) =>
                                (e.currentTarget.style.transform = "scale(1)")
                            }
                        >
                            <PictureAsPdfIcon style={{ fontSize: '20px' }} />
                            Export to PDF
                        </button>
                        <button
                            onClick={exportCompletenessToPDF}
                            style={{
                                backgroundColor: "#3b82f6", // Blue color
                                color: "#ffffff",
                                padding: "0.75rem 1.5rem",
                                borderRadius: "0.375rem",
                                fontWeight: "500",
                                cursor: "pointer",
                                transition: "background-color 0.2s ease, transform 0.1s ease",
                                border: "none",
                                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "0.5rem"
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#2563eb")}
                            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#3b82f6")}
                            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
                            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                        >
                            <PictureAsPdfIcon style={{ fontSize: '20px' }} />
                            Export Completeness to PDF
                        </button>
                        </div>
                        <div id="pdf-content">
                            <div className="pdf-page">
                                <DataTable title="Track 2 All Prisms" data={allPrismsDataTK2} />
                                <DataTable title="Track 2 Prisms over Ohio Bridge (7 to 11)" data={ohioBridgeDataTK2} />
                            </div>
                            <div className="pdf-page">
                                <DataTable title="Track 2 Prisms (12 to 22)" data={track2Prisms12to22Data} />
                                <DataTable title="Track 2 Prisms over Washington Channel Bridge (23 to 28)" data={washingtonChannelDataTK2} />
                            </div>
                            <div className="pdf-page">
                                <DataTable title="Track 3 All Prisms" data={allPrismsDataTK3} />
                                <DataTable title="Track 3 Prisms over Ohio Bridge (7 to 11)" data={ohioBridgeDataTK3} />
                            </div>
                            <div className="pdf-page">
                                <DataTable title="Track 3 Prisms (12 to 22)" data={track3Prisms12to22Data} />
                                <DataTable title="Track 3 Prisms over Washington Channel Bridge (23 to 28)" data={washingtonChannelDataTK3} />
                            </div>
                        </div>
                        <div id="completeness-pdf-content" style={{ marginTop: '2rem' }}>
                            <TimeBasedCompletenessSummary />
                        </div>
                    </>
                )}
            </MainContentWrapper>
        </>
    );
}

export default LongBridgeDataSummary;