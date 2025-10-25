import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import HeaNavLogo from "../components/HeaNavLogo";
import BackButton from "../components/Back";
import MainContentWrapper from "../components/MainContentWrapper";
import logo from "../assets/logo.jpg";
import { toast } from "react-toastify";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from "@mui/material";

type SentAlert = {
  id: number;
  instrument_id: string;
  node_id: number;
  timestamp: string;
  alert_type: string;
  created_at: string;
  acknowledgement: boolean;
  // Additional fields we'll fetch from related tables
  instrument_name?: string;
  instrument_location?: string;
  project_name?: string;
  serial_number?: string;
};

const Alarms: React.FC = () => {
  const [alerts, setAlerts] = useState<SentAlert[]>([]);
  const [filterAck, setFilterAck] = useState<boolean | null>(null);
  const [filterAlertType, setFilterAlertType] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  // Confirmation dialog state
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [alertToAcknowledge, setAlertToAcknowledge] = useState<SentAlert | null>(null);

  useEffect(() => {
    const fetchAlerts = async () => {
      setLoading(true);
      try {
        console.log(`Starting to fetch alerts - Page ${currentPage}, Size ${pageSize}...`);
        
        // Calculate offset for pagination
        const offset = (currentPage - 1) * pageSize;
        
        // First, get total count for pagination
        let countQuery = supabase
          .from('sent_alerts')
          .select('*', { count: 'exact', head: true });

        // Apply filters to count query
        if (filterAck !== null) {
          countQuery = countQuery.eq('acknowledgement', filterAck);
        }
        if (filterAlertType !== 'all') {
          countQuery = countQuery.eq('alert_type', filterAlertType);
        }

        const { count, error: countError } = await countQuery;
        
        if (countError) {
          console.error('Count query error:', countError);
          throw countError;
        }

        setTotalCount(count || 0);
        setTotalPages(Math.ceil((count || 0) / pageSize));
        
        // Now get paginated alerts
        let query = supabase
          .from('sent_alerts')
          .select('id, instrument_id, node_id, timestamp, alert_type, acknowledgement')
          .order('timestamp', { ascending: false })
          .range(offset, offset + pageSize - 1);

        // Apply acknowledgement filter
        if (filterAck !== null) {
          query = query.eq('acknowledgement', filterAck);
        }

        // Apply alert type filter
        if (filterAlertType !== 'all') {
          query = query.eq('alert_type', filterAlertType);
        }

        const { data: alertsData, error } = await query;

        if (error) {
          console.error('Query error:', error);
          throw error;
        }

        console.log('Query successful, got alerts:', alertsData?.length || 0);

        if (!alertsData || alertsData.length === 0) {
          setAlerts([]);
          return;
        }

        // Get unique instrument IDs from alerts
        const instrumentIds = [...new Set(alertsData.map(alert => alert.instrument_id))];
        
        // Fetch all instruments at once
        const { data: instrumentsData, error: instrumentsError } = await supabase
          .from('instruments')
          .select('instrument_id, instrument_name, instrument_location, sno, project_id')
          .in('instrument_id', instrumentIds);

        if (instrumentsError) {
          console.warn('Could not fetch instruments:', instrumentsError);
        }

        // Create a map of instrument data for quick lookup
        const instrumentsMap = new Map();
        if (instrumentsData) {
          instrumentsData.forEach(instrument => {
            instrumentsMap.set(instrument.instrument_id, instrument);
          });
        }

        // Filter out alerts from deleted instruments - only keep alerts for existing instruments
        const validAlerts = alertsData.filter(alert => instrumentsMap.has(alert.instrument_id));
        
        console.log(`Filtered alerts: ${alertsData.length} total, ${validAlerts.length} from existing instruments`);

        // Now enrich alerts with instrument information
        const enrichedAlerts = await Promise.all(
          validAlerts.map(async (alert) => {
            try {
              const instrument = instrumentsMap.get(alert.instrument_id);
              
              // This should always exist since we filtered above, but just in case
              if (!instrument) {
                console.warn(`Instrument ${alert.instrument_id} not found after filtering`);
                return null; // Skip this alert
              }
              
              // Get project details if project_id exists
              let projectName = 'Unknown Project';
              if (instrument.project_id) {
                try {
                  const { data: projectData, error: projectError } = await supabase
                    .from('Projects')
                    .select('name')
                    .eq('id', instrument.project_id)
                    .maybeSingle();

                  if (!projectError && projectData) {
                    projectName = projectData.name;
                  }
                } catch (projectError) {
                  console.warn(`Project lookup failed for ${alert.instrument_id}:`, projectError);
                }
              }

              return {
                id: alert.id,
                instrument_id: alert.instrument_id,
                node_id: alert.node_id,
                timestamp: alert.timestamp,
                alert_type: alert.alert_type,
                acknowledgement: alert.acknowledgement,
                created_at: new Date().toISOString(),
                instrument_name: instrument.instrument_name || alert.instrument_id,
                instrument_location: instrument.instrument_location || 'N/A',
                project_name: projectName,
                serial_number: instrument.sno || 'N/A'
              };
            } catch (error) {
              console.warn(`Error enriching alert ${alert.id}:`, error);
              return null; // Skip this alert on error
            }
          })
        );

        // Filter out any null values (skipped alerts)
        const finalAlerts = enrichedAlerts.filter(alert => alert !== null);
        
        console.log(`Final alerts after enrichment: ${finalAlerts.length}`);
        setAlerts(finalAlerts);

    } catch (error) {
        console.error('Error fetching alerts:', error);
        toast.error('Failed to fetch alerts: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

    fetchAlerts();
  }, [filterAck, filterAlertType, currentPage, pageSize]);

  const handleAcknowledge = async (alert: SentAlert) => {
    setAlertToAcknowledge(alert);
    setConfirmDialogOpen(true);
  };

  const confirmAcknowledge = async () => {
    if (!alertToAcknowledge) return;
    
    try {
      console.log('Acknowledging alert with ID:', alertToAcknowledge.id);
      const { error } = await supabase
        .from('sent_alerts')
        .update({
          acknowledgement: true
        })
        .eq('id', alertToAcknowledge.id);
      
      if (error) {
        console.error('Acknowledge error:', error);
        throw error;
      }

      // Update the specific alert in the current alerts array
      setAlerts(prevAlerts => 
        prevAlerts.map(alert => 
          alert.id === alertToAcknowledge.id 
            ? { ...alert, acknowledgement: true }
            : alert
        )
      );

      setConfirmDialogOpen(false);
      setAlertToAcknowledge(null);
      toast.success('Alert acknowledged successfully!');
      
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      toast.error('Failed to acknowledge alert: ' + (error as Error).message);
      setConfirmDialogOpen(false);
      setAlertToAcknowledge(null);
    }
  };

  const cancelAcknowledge = () => {
    setConfirmDialogOpen(false);
    setAlertToAcknowledge(null);
  };

  // Pagination functions
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  // Define table columns
  const columns = [
    { key: 'timestamp', label: 'Timestamp' },
    { key: 'instrument_name', label: 'Instrument Name' },
    { key: 'project_name', label: 'Project' },
    { key: 'instrument_location', label: 'Location' },
    { key: 'alert_type', label: 'Alert Type' },
    { key: 'acknowledgement', label: 'Status' },
    { key: 'actions', label: 'Actions' }
  ];

  return (
  <>
    <HeaNavLogo />
    <MainContentWrapper>
    <BackButton />
      <div className="page">
        <div className="content" style={{ padding: "2rem" }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>Sent Alerts</h2>
          </div>

          {/* Filter controls */}
          <div style={{ marginBottom: "1rem", display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <select
              value={filterAck === null ? 'all' : filterAck.toString()}
              onChange={(e) => 
                setFilterAck(e.target.value === 'all' ? null : e.target.value === 'true')
              }
              style={{
                padding: "10px",
                fontSize: "16px",
                border: "1px solid #000",
                borderRadius: "4px",
                backgroundColor: "#fff",
                width: "200px",
                outline: "none",
                boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
              }}
            >
              <option value="all">All Alerts</option>
              <option value="true">Acknowledged</option>
              <option value="false">Unacknowledged</option>
            </select>
            
            <select
              value={filterAlertType}
              onChange={(e) => setFilterAlertType(e.target.value)}
              style={{
                padding: "10px",
                fontSize: "16px",
                border: "1px solid #000",
                borderRadius: "4px",
                backgroundColor: "#fff",
                width: "200px",
                outline: "none",
                boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
              }}
            >
              <option value="all">All Alert Types</option>
              <option value="shutdown">Shutdown</option>
              <option value="warning">Warning</option>
              <option value="alert">Alert</option>
              <option value="any">Any</option>
            </select>

            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              style={{
                padding: "10px",
                fontSize: "16px",
                border: "1px solid #000",
                borderRadius: "4px",
                backgroundColor: "#fff",
                width: "120px",
                outline: "none",
                boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
              }}
            >
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
              <option value={200}>200 per page</option>
              <option value={500}>500 per page</option>
            </select>
          </div>

          {/* Pagination info */}
          <div style={{ marginBottom: "1rem", display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '14px', color: '#666' }}>
              Showing {alerts.length} of {totalCount} alerts (Page {currentPage} of {totalPages})
            </div>
            
            {/* Pagination controls */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                style={{
                  padding: '8px 12px',
                  backgroundColor: currentPage === 1 ? '#ccc' : '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                First
              </button>
              
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                  padding: '8px 12px',
                  backgroundColor: currentPage === 1 ? '#ccc' : '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                Previous
              </button>
              
              <span style={{ padding: '0 10px', fontSize: '14px' }}>
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{
                  padding: '8px 12px',
                  backgroundColor: currentPage === totalPages ? '#ccc' : '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                Next
              </button>
              
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                style={{
                  padding: '8px 12px',
                  backgroundColor: currentPage === totalPages ? '#ccc' : '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                Last
              </button>
            </div>
          </div>

          {/* Alerts Table */}
          {loading ? (
            <p>Loading alerts...</p>
          ) : (
            <div className="data-table" style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  tableLayout: "auto",
                }}
              >
                <thead>
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        style={{
                          border: "1px solid #000",
                          padding: "12px",
                          backgroundColor: "#f4f4f4",
                          color: "#333",
                          textAlign: "left",
                          fontWeight: "bold",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {alerts.length > 0 ? (
                    alerts.map((alert) => (
                      <tr
                        key={alert.id}
                        style={{
                          transition: "background-color 0.3s",
                          backgroundColor: alert.acknowledgement ? '#f8fff8' : '#fff8f8'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = alert.acknowledgement ? '#f0fff0' : '#fff0f0';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = alert.acknowledgement ? '#f8fff8' : '#fff8f8';
                        }}
                      >
                        {columns.map((column) => {
                          if (column.key === 'actions') {
                            return (
                              <td
                                key={column.key}
                                style={{
                                  border: "1px solid #000",
                                  padding: "12px",
                                  textAlign: "left",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {!alert.acknowledgement && (
                                  <button
                                    onClick={() => handleAcknowledge(alert)}
                                    style={{
                                      padding: '6px 12px',
                                      backgroundColor: '#4CAF50',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Acknowledge
                                  </button>
                                )}
                              </td>
                            );
                          }

                          if (column.key === 'acknowledgement') {
                            return (
                              <td
                                key={column.key}
                                style={{
                                  border: "1px solid #000",
                                  padding: "12px",
                                  textAlign: "left",
                                  color: alert.acknowledgement ? 'green' : 'red',
                                  fontWeight: 'bold'
                                }}
                              >
                                {alert.acknowledgement ? 'Acknowledged' : 'Unacknowledged'}
                              </td>
                            );
                          }

                          if (column.key === 'alert_type') {
                            const getAlertTypeColor = (type: string) => {
                              switch (type) {
                                case 'shutdown': return '#d32f2f';
                                case 'warning': return '#f57c00';
                                case 'alert': return '#1976d2';
                                default: return '#666';
                              }
                            };
                            
                            return (
                              <td
                                key={column.key}
                                style={{
                                  border: "1px solid #000",
                                  padding: "12px",
                                  textAlign: "center",
                                  color: getAlertTypeColor(alert.alert_type),
                                  fontWeight: 'bold',
                                  textTransform: 'capitalize'
                                }}
                              >
                                {alert.alert_type}
                              </td>
                            );
                          }

                          return (
                            <td
                              key={column.key}
                              style={{
                                border: "1px solid #000",
                                padding: "12px",
                                textAlign: "left",
                              }}
                            >
                              {alert[column.key as keyof SentAlert]?.toString() || 'N/A'}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={columns.length} style={{ textAlign: 'center', padding: '20px' }}>
                        No alerts found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Centered Background Logo */}
          <div className="centered-logo">
            <img
              src={logo}
              alt="DGMTS Logo"
              style={{
                position: "fixed",
                top: "65%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "30vw",
                opacity: 0.1,
                zIndex: -1,
                pointerEvents: "none",
              }}
            />
          </div>
        </div>

        <footer>© 2025 DGMTS. All rights reserved.</footer>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onClose={cancelAcknowledge}>
        <DialogTitle>Confirm Alert Acknowledgement</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to acknowledge this alert?
            <br />
            <br />
            <strong>Instrument:</strong> {alertToAcknowledge?.instrument_name}
            <br />
            <strong>Project:</strong> {alertToAcknowledge?.project_name}
            <br />
            <strong>Alert Type:</strong> {alertToAcknowledge?.alert_type}
            <br />
            <strong>Timestamp:</strong> {alertToAcknowledge?.timestamp}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelAcknowledge} color="primary">
            Cancel
          </Button>
          <Button onClick={confirmAcknowledge} variant="contained" color="primary" autoFocus>
            Yes, Acknowledge
          </Button>
        </DialogActions>
      </Dialog>
    </MainContentWrapper>
  </>
  );
};

export default Alarms;