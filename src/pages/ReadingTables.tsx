import React, { useRef, useState, useEffect } from 'react';
import HeaNavLogo from '../components/HeaNavLogo';
import * as XLSX from "xlsx";
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import { AllCommunityModule, ModuleRegistry, } from 'ag-grid-community';
import { themeQuartz } from 'ag-grid-community'

import { DragIndicator, Visibility } from '@mui/icons-material';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Checkbox,
    Button,
    Typography
} from '@mui/material';
import MainContentWrapper from '../components/MainContentWrapper';
import TrackMerger from '../components/MergeATMSTracks';



interface ColumnData {
    id: string;
    columnName: string;
    description: string;
    columnCount: number;
    type: string;
}
const ReadingTables: React.FC = () => {
    const processSaveRef = useRef<HTMLButtonElement>(null);
    const [processedData, setProcessedData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [showtable, setShowTable] = useState(false);
    const [selected, setSelected] = useState<string[]>([]);
    const [columnsData, setColumnsData] = useState<ColumnData[]>([]);
    const [presentationMode, setPresentationMode] = useState(false);
    const [presentationData, setPresentationData] = useState<any[]>([]);
    const [columnDefs, setColumnDefs] = useState<any[]>([]);

    ModuleRegistry.registerModules([AllCommunityModule]);

    useEffect(() => {
        localStorage.clear();
    }, []);

    const handleMergeClick = () => {
        processSaveRef.current?.click();
    };
    console.log('headers', headers);
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
            if (atmsStartIndex > 0) {
                newRow.push(...row.slice(atmsStartIndex));
            }

            result.push(newRow);
        }

        const newHeader: (string | number)[] = [headers[0]];

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
        setShowTable(true);
    };
    useEffect(() => {
        const processedHeaders = JSON.parse(localStorage.getItem("processedHeaders") || "[]");

        if (processedHeaders.length === 0) return;
        const columnGroups: Record<string, ColumnData> = {};

        processedHeaders.forEach((header: string) => {
            if (!header || header === 'Time') return;

            let type = '';
            let description = 'Calibrated';

            if (header.includes('LBN-TP-TK2') && !header.includes('Difference') && header.includes('A')) {
                type = 'LBN-TP-TK2A ';
            }
            else if (header.includes('LBN-TP-TK2') && !header.includes('Difference') && header.includes('B')) {
                type = 'LBN-TP-TK2B ';
            }
            else if (header.includes('LBN-TP-TK3') && !header.includes('Difference') && header.includes('A')) {
                type = 'LBN-TP-TK3A ';
            }
            else if (header.includes('LBN-TP-TK3') && !header.includes('Difference') && header.includes('B')) {
                type = 'LBN-TP-TK3B ';

            }
            else if (header.includes('LBN-TP-TK2') && header.includes('Difference')) {
                type = 'Track 2 Difference';
            }
            else if (header.includes('LBN-TP-TK3') && header.includes('Difference')) {
                type = 'Track 3 Difference';
            }
            else if (header.includes('LBN-AMTS-1')) {
                type = 'AMTS 1';
            }
            else if (header.includes('LBN-AMTS-2')) {
                type = 'AMTS 2';
            }


            if (!type) return;

            if (!columnGroups[type]) {
                columnGroups[type] = {
                    id: type,
                    columnName: type,
                    description,
                    columnCount: 0,
                    type
                };
            }
            columnGroups[type].columnCount++;
        });

        setColumnsData(Object.values(columnGroups));
    }, [processedData]);




    const isSelected = (id: string) => selected.indexOf(id) !== -1;


const downloadSelectedColumns = () => {
    if (selected.length !== 1) return;

    const selectedType = selected[0];
    const processedHeaders = JSON.parse(localStorage.getItem("processedHeaders") || "[]");
    const processedData = JSON.parse(localStorage.getItem("processedData") || "[]");

    if (processedData.length < 2 || processedHeaders.length === 0) return;

    // Get all headers that match the selected type
    const selectedHeaders = processedHeaders.filter((header: string) => {
        if (!header || header === 'Time') return false;

        // More precise matching using regex
        const headerMatch = header.match(/LBN-TP-(TK[23])(-\d+)([AB])/);
        if (!headerMatch) return false;
        
        const [_, track,prismType] = headerMatch;

        if (selectedType === 'LBN-TP-TK2A ' && track === 'TK2' && prismType === 'A') {
            return true;
        } else if (selectedType === 'LBN-TP-TK2B ' && track === 'TK2' && prismType === 'B') {
            return true;
        } else if (selectedType === 'LBN-TP-TK3A ' && track === 'TK3' && prismType === 'A') {
            return true;
        } else if (selectedType === 'LBN-TP-TK3B ' && track === 'TK3' && prismType === 'B') {
            return true;
        } else if (selectedType === 'Track 2 Difference' && header.includes('LBN-TP-TK2') && header.includes('Difference')) {
            return true;
        } else if (selectedType === 'Track 3 Difference' && header.includes('LBN-TP-TK3') && header.includes('Difference')) {
            return true;
        } else if (selectedType === 'AMTS 1' && header.includes('LBN-AMTS-1')) {
            return true;
        } else if (selectedType === 'AMTS 2' && header.includes('LBN-AMTS-2')) {
            return true;
        }
        return false;
    });

    const allHeaders = ['Time', ...selectedHeaders];
    const headerIndices = allHeaders.map(header => processedHeaders.indexOf(header));
    const newData = processedData.slice(1).map((row: any[]) => {
        return headerIndices.map(index => row[index]);
    });
    newData.unshift(allHeaders);
    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(newData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Selected Data");
    const fileName = selectedType.replace(/\s+/g, '_') + '_data.xlsx';
    XLSX.writeFile(wb, fileName);
};


    const handleClick = (_event: React.MouseEvent<unknown>, id: string) => {
        if (selected.includes(id)) {
            setSelected([]);
            return;
        }
        setSelected([id]);
    };
    const preparePresentationData = () => {
        if (selected.length !== 1) return;

        const selectedType = selected[0];
        const processedHeaders = JSON.parse(localStorage.getItem("processedHeaders") || "[]");
        const processedData = JSON.parse(localStorage.getItem("processedData") || "[]");

        if (processedData.length < 2 || processedHeaders.length === 0) return;

        const selectedHeaders = processedHeaders.filter((header: string) => {
            if (!header || header === 'Time') return false;
            if (selectedType === 'LBN-TP-TK2A ' && header.includes('LBN-TP-TK2') && !header.includes('Difference') && header.includes('A')) return true;
            if (selectedType === 'LBN-TP-TK2B ' && header.includes('LBN-TP-TK2') && !header.includes('Difference') && header.includes('B')) return true;
            if (selectedType === 'LBN-TP-TK3A ' && header.includes('LBN-TP-TK3') && !header.includes('Difference') && header.includes('A')) return true;
            if (selectedType === 'LBN-TP-TK3B ' && header.includes('LBN-TP-TK3') && !header.includes('Difference') && header.includes('B')) return true;
            if (selectedType === 'Track 2 Difference' && header.includes('LBN-TP-TK2') && header.includes('Difference')) return true;
            if (selectedType === 'Track 3 Difference' && header.includes('LBN-TP-TK3') && header.includes('Difference')) return true;
            if (selectedType === 'AMTS 1' && header.includes('LBN-AMTS-1')) return true;
            if (selectedType === 'AMTS 2' && header.includes('LBN-AMTS-2')) return true;
            return false;
        });

        const allHeaders = ['Time', ...selectedHeaders];
        const newColumnDefs = allHeaders.map(header => ({
            headerName: header,
            field: header.replace(/[^a-zA-Z0-9]/g, '_'),
            filter: true,
            sortable: true,
            resizable: true
        }));

        const rowData = processedData.slice(1).map((row: any[]) => {
            const rowObj: any = {};
            allHeaders.forEach(header => {
                const headerIndex = processedHeaders.indexOf(header);
                rowObj[header.replace(/[^a-zA-Z0-9]/g, '_')] = row[headerIndex];
            });
            return rowObj;
        });

        setColumnDefs(newColumnDefs);
        setPresentationData(rowData);
        setPresentationMode(true);
    };
    return (
        <>
            <HeaNavLogo />
            <MainContentWrapper>
                <h1>File Manager</h1>
                <TrackMerger onMergeSave={handleMergeClick} />

                <div style={{ display: "flex", gap: "1rem", marginTop: "0" }}>
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
                {showtable && (
                    <div style={{ padding: '20px' }}>
                        <Typography variant="h4" gutterBottom>
                            Data Columns Overview
                        </Typography>

                        <TableContainer component={Paper}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell padding="checkbox">
                                        </TableCell>
                                        <TableCell>Column Name</TableCell>
                                        <TableCell>Description</TableCell>
                                        <TableCell>Action</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {columnsData.map((row) => {
                                        const isItemSelected = isSelected(row.id);
                                        return (
                                            <TableRow
                                                key={row.id}
                                                hover
                                                onClick={(event) => handleClick(event, row.id)}
                                                role="checkbox"
                                                aria-checked={isItemSelected}
                                                selected={isItemSelected}
                                            >
                                                <TableCell padding="checkbox">
                                                    <Checkbox checked={isItemSelected} />
                                                </TableCell>
                                                <TableCell>{row.columnName}</TableCell>
                                                <TableCell>{row.description}</TableCell>
                                                <TableCell>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <Button
                                                            variant="outlined"
                                                            disabled={!isItemSelected}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                downloadSelectedColumns();
                                                            }}
                                                        >
                                                            Download
                                                        </Button>
                                                        <Button
                                                            variant="contained"
                                                            color="primary"
                                                            disabled={!isItemSelected}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                preparePresentationData();
                                                            }}
                                                            size="small"
                                                            style={{ minWidth: 0, padding: '6px' }}
                                                        >
                                                            <Visibility fontSize="small" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </div>
                )}
                {presentationMode && (
                    <div style={{
                        position: 'fixed',
                        bottom: '20px',
                        right: '20px',
                        width: '80%',
                        height: '60%',
                        zIndex: 1000,
                        backgroundColor: 'white',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <div style={{
                            padding: '8px 16px',
                            backgroundColor: '#f5f5f5',
                            borderBottom: '1px solid #ddd',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <DragIndicator style={{ marginRight: '8px' }} />
                                <Typography variant="subtitle1">Presentation View</Typography>
                            </div>
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={() => setPresentationMode(false)}
                            >
                                Close
                            </Button>
                        </div>
                        <div className="ag-theme-balham" style={{ flex: 1, width: '100%' }}>
                            <AgGridReact
                                columnDefs={columnDefs}
                                rowData={presentationData}
                                modules={[AllCommunityModule]}
                                onGridReady={params => params.api.sizeColumnsToFit()}
                                defaultColDef={{
                                    flex: 1,
                                    minWidth: 100,
                                    filter: true,
                                    sortable: true,

                                }}
                                theme={themeQuartz}
                                animateRows={true}
                                pagination={true}
                                paginationPageSize={10}
                            />
                        </div>
                    </div>
                )}
            </MainContentWrapper>
        </>
    )
}
export default ReadingTables;
