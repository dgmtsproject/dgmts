import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import HeaNavLogo from "../components/HeaNavLogo";
import MainContentWrapper from "../components/MainContentWrapper";
import { useAdminContext } from "../context/AdminContext";
import logo from "../assets/logo.jpg";
import Button from "@mui/material/Button";
import AddIcon from "@mui/icons-material/Add";

type Alarm = {
  id: number;
  instrument_id: string;
  timestamp: string;
  sensor: string;
  limit_label: string;
  equation: string;
  value: number;
  acknowledged: boolean;
  acknowledged_timestamp: string | null;
  comment: string;
  instrument_name: string;
  project_name: string;
  user_email: string;
};

const Alarms: React.FC = () => {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [filterAck, setFilterAck] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const { isAdmin, userEmail } = useAdminContext();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAlarms = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_filtered_alarms', {
          is_admin: isAdmin,
          user_email_param: userEmail,
          ack_filter: filterAck
        });
        console.log(isAdmin, userEmail, filterAck);
        console.log(data);
        if (error) throw error;
        setAlarms(data || []);
      } catch (error) {
        console.error('Error fetching alarms:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlarms();
  }, [filterAck, isAdmin, userEmail]);

  const handleAcknowledge = async (alarmId: number) => {
    try {
      const { error } = await supabase
        .from('alarms')
        .update({
          acknowledged: true,
          acknowledged_timestamp: new Date().toISOString()
        })
        .eq('id', alarmId);

      if (error) throw error;

      // Refresh alarms after update
      const { data } = await supabase.rpc('get_filtered_alarms', {
        is_admin: isAdmin,
        user_email_param: userEmail,
        ack_filter: filterAck
      });
      setAlarms(data || []);
    } catch (error) {
      console.error('Error acknowledging alarm:', error);
    }
  };

  const handleAddAlarm = () => {
    navigate("/add-alarms");
  };

  // Define table columns
  const columns = [
    { key: 'timestamp', label: 'Timestamp' },
    { key: 'sensor', label: 'Sensor' },
    { key: 'instrument_name', label: 'Instrument' },
    { key: 'project_name', label: 'Project' },
    { key: 'limit_label', label: 'Limit' },
    { key: 'value', label: 'Value' },
    { key: 'acknowledged', label: 'Status' },
    { key: 'comment', label: 'Comment' },
    { key: 'actions', label: 'Actions' }
  ];

  return (
    <>
      <HeaNavLogo />
      <MainContentWrapper>
        <div className="page">
          <div className="content" style={{ padding: "2rem" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>Alarms</h2>
              {isAdmin && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={handleAddAlarm}
                  style={{
                    backgroundColor: '#1976d2',
                    color: 'white',
                    textTransform: 'none',
                    fontWeight: 'bold'
                  }}
                >
                  Add Alarm
                </Button>
              )}
            </div>

            {/* Filter controls */}
            <div style={{ marginBottom: "1rem", display: 'flex', gap: '1rem' }}>
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
                <option value="all">All Alarms</option>
                <option value="true">Acknowledged</option>
                <option value="false">Unacknowledged</option>
              </select>
            </div>

            {/* Alarms Table */}
            {loading ? (
              <p>Loading alarms...</p>
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
                    {alarms.length > 0 ? (
                      alarms.map((alarm) => (
                        <tr
                          key={alarm.id}
                          style={{
                            transition: "background-color 0.3s",
                            backgroundColor: alarm.acknowledged ? '#f8fff8' : '#fff8f8'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = alarm.acknowledged ? '#f0fff0' : '#fff0f0';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = alarm.acknowledged ? '#f8fff8' : '#fff8f8';
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
                                  {!alarm.acknowledged && (
                                    <button
                                      onClick={() => handleAcknowledge(alarm.id)}
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

                            if (column.key === 'acknowledged') {
                              return (
                                <td
                                  key={column.key}
                                  style={{
                                    border: "1px solid #000",
                                    padding: "12px",
                                    textAlign: "left",
                                    color: alarm.acknowledged ? 'green' : 'red',
                                    fontWeight: 'bold'
                                  }}
                                >
                                  {alarm.acknowledged ? 'Acknowledged' : 'Unacknowledged'}
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
                                {alarm[column.key as keyof Alarm]?.toString() || 'N/A'}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={columns.length} style={{ textAlign: 'center', padding: '20px' }}>
                          No alarms found
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
      </MainContentWrapper>
    </>
  );
};

export default Alarms;