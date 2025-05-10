import React, { useEffect, useMemo } from 'react';
import * as XLSX from "xlsx";
import MainContentWrapper from '../components/MainContentWrapper';
import HeaNavLogo from '../components/HeaNavLogo';
import excelFile from '../assets/files/track-files-and-amts.xlsx?url';

const DataSummary: React.FC = () => {
    const [processedData, setProcessedData] = React.useState<any[]>([]);
    const [headers, setHeaders] = React.useState<string[]>([]);
    const [lessthanValue, setLessThanValue] = React.useState<number | null>(null);
    const [greaterthanValue, setGreaterThanValue] = React.useState<number | null>(null);
    const [showSummary, setShowSummary] = React.useState(false);

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

    useEffect(() => {
        const loadAndProcessExcel = async () => {
            try {
                const response = await fetch(excelFile);
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

    const exportToExcel = () => {
        const wb = XLSX.utils.book_new();

        const prepareWorksheet = (data: any[], title: string) => {
            const wsData = [
                // Header row
                ['Measurement', 'Data Points', `< ${lessthanValue ?? 'N/A'}`, '% Less Than',
                    `> ${greaterthanValue ?? 'N/A'}`, '% Greater Than', 'Avg +ve', 'Avg -ve'],
                // Data rows
                ...data.map(row => [
                    row.measurementType,
                    row.totalPoints,
                    row.lessThanCount,
                    row.lessThanPercent,
                    row.greaterThanCount,
                    row.greaterThanPercent,
                    row.avgPositive,
                    row.avgNegative
                ])
            ];
            console.log(title);
            return XLSX.utils.aoa_to_sheet(wsData);

    

        };

        XLSX.utils.book_append_sheet(wb, prepareWorksheet(allPrismsDataTK2, 'Track 2 All Prisms'), 'TK2 All Prisms');
        XLSX.utils.book_append_sheet(wb, prepareWorksheet(ohioBridgeDataTK2, 'Track 2 Ohio Bridge'), 'TK2 Ohio Bridge');
        XLSX.utils.book_append_sheet(wb, prepareWorksheet(track2Prisms12to22Data, 'Track 2 Prisms 12-22'), 'TK2 Prisms 12-22');
        XLSX.utils.book_append_sheet(wb, prepareWorksheet(washingtonChannelDataTK2, 'Track 2 Wash Channel'), 'TK2 Wash Channel');

        XLSX.utils.book_append_sheet(wb, prepareWorksheet(allPrismsDataTK3, 'Track 3 All Prisms'), 'TK3 All Prisms');
        XLSX.utils.book_append_sheet(wb, prepareWorksheet(ohioBridgeDataTK3, 'Track 3 Ohio Bridge'), 'TK3 Ohio Bridge');
        XLSX.utils.book_append_sheet(wb, prepareWorksheet(track3Prisms12to22Data, 'Track 3 Prisms 12-22'), 'TK3 Prisms 12-22');
        XLSX.utils.book_append_sheet(wb, prepareWorksheet(washingtonChannelDataTK3, 'Track 3 Wash Channel'), 'TK3 Wash Channel');

        XLSX.writeFile(wb, 'Data_Summary_Output.xlsx');
    };

    return (
        <>
            <HeaNavLogo />
            <MainContentWrapper>
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
                    </div>
                </div>

                {showSummary && (
                    <>
                        <button
                            onClick={exportToExcel}
                            style={{
                                backgroundColor: "#10b981",
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
                                (e.currentTarget.style.backgroundColor = "#059669")
                            }
                            onMouseOut={(e) =>
                                (e.currentTarget.style.backgroundColor = "#10b981")
                            }
                            onMouseDown={(e) =>
                                (e.currentTarget.style.transform = "scale(0.98)")
                            }
                            onMouseUp={(e) =>
                                (e.currentTarget.style.transform = "scale(1)")
                            }
                        >
                            Export to Excel
                        </button>
                        <DataTable title="Track 2 All Prisms" data={allPrismsDataTK2} />
                        <DataTable title="Track 2 Prisms over Ohio Bridge (7 to 11)" data={ohioBridgeDataTK2} />
                        <DataTable title="Track 2 Prisms (12 to 22)" data={track2Prisms12to22Data} />
                        <DataTable title="Track 2 Prisms over Washington Channel Bridge (23 to 28)" data={washingtonChannelDataTK2} />

                        {/* Track 3 Tables */}
                        <DataTable title="Track 3 All Prisms" data={allPrismsDataTK3} />
                        <DataTable title="Track 3 Prisms over Ohio Bridge (7 to 11)" data={ohioBridgeDataTK3} />
                        <DataTable title="Track 3 Prisms (12 to 22)" data={track3Prisms12to22Data} />
                        <DataTable title="Track 3 Prisms over Washington Channel Bridge (23 to 28)" data={washingtonChannelDataTK3} />
                    </>
                )}
            </MainContentWrapper>
        </>
    );
}

export default DataSummary;