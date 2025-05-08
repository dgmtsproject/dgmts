import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import HeaNavLogo from "../components/HeaNavLogo";
import MainContentWrapper from "../components/MainContentWrapper";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Button,
  Box,
  Typography,
  Paper
} from "@mui/material";

interface Project {
  id: string;
  name: string;
}

interface Instrument {
  instrument_id: string;
  instrument_name: string;
  project_id: string;
}

const AddAlarms: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [selectedInstrument, setSelectedInstrument] = useState<string>("");
  const [formData, setFormData] = useState({
    sensor: "",
    limit_label: "",
    equation: "",
    value: "",
    comment: ""
  });
  const [loading, setLoading] = useState({
    projects: true,
    instruments: false
  });
  const navigate = useNavigate();

  // Fetch projects on component mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data, error } = await supabase
          .from("Projects")
          .select("id, name")
          .order("name", { ascending: true });

        if (error) throw error;
        setProjects(data || []);
      } catch (error) {
        toast.error("Failed to load projects");
        console.error("Error fetching projects:", error);
      } finally {
        setLoading(prev => ({ ...prev, projects: false }));
      }
    };

    fetchProjects();
  }, []);

  // Fetch instruments when project is selected
  useEffect(() => {
    const fetchInstruments = async () => {
      if (!selectedProject) return;

      setLoading(prev => ({ ...prev, instruments: true }));
      setSelectedInstrument("");
      setInstruments([]);

      try {
        const { data, error } = await supabase
          .from("instruments")
          .select("instrument_id, instrument_name, project_id")
          .eq("project_id", selectedProject)
          .order("instrument_name", { ascending: true });

        if (error) throw error;
        setInstruments(data || []);
      } catch (error) {
        toast.error("Failed to load instruments");
        console.error("Error fetching instruments:", error);
      } finally {
        setLoading(prev => ({ ...prev, instruments: false }));
      }
    };

    fetchInstruments();
  }, [selectedProject]);

  const handleProjectChange = (e: any) => {
    setSelectedProject(e.target.value);
  };

  const handleInstrumentChange = (e: any) => {
    setSelectedInstrument(e.target.value);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedInstrument) {
      toast.error("Please select an instrument");
      return;
    }

    try {
      const { error } = await supabase.from("alarms").insert([{
        instrument_id: selectedInstrument,
        timestamp: new Date().toISOString(),
        sensor: formData.sensor,
        limit_label: formData.limit_label,
        equation: formData.equation,
        value: parseFloat(formData.value),
        acknowledged: false,
        acknowledged_timestamp: null,
        comment: formData.comment,
        created_at: new Date().toISOString()
      }]);

      if (error) throw error;

      toast.success("Alarm created successfully!");
      navigate("/alarms");
    } catch (error) {
      toast.error("Failed to create alarm");
      console.error("Error creating alarm:", error);
    }
  };

  return (
    <MainContentWrapper>
      <HeaNavLogo />
      <Box sx={{ padding: 3 }}>
        <Paper elevation={3} sx={{ padding: 3, maxWidth: 800, margin: "0 auto" }}>
          <Typography variant="h4" gutterBottom>
            Add New Alarm
          </Typography>

          <form onSubmit={handleSubmit}>
            <FormControl fullWidth margin="normal" required>
              <InputLabel id="project-select-label">Project</InputLabel>
              <Select
                labelId="project-select-label"
                id="project-select"
                value={selectedProject}
                label="Project"
                onChange={handleProjectChange}
                disabled={loading.projects}
              >
                <MenuItem value="">
                  <em>Select a project</em>
                </MenuItem>
                {projects.map(project => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth margin="normal" required>
              <InputLabel id="instrument-select-label">Instrument</InputLabel>
              <Select
                labelId="instrument-select-label"
                id="instrument-select"
                value={selectedInstrument}
                label="Instrument"
                onChange={handleInstrumentChange}
                disabled={!selectedProject || loading.instruments}
              >
                <MenuItem value="">
                  <em>Select an instrument</em>
                </MenuItem>
                {instruments.map(instrument => (
                  <MenuItem key={instrument.instrument_id} value={instrument.instrument_id}>
                    {instrument.instrument_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              margin="normal"
              required
              label="Sensor"
              name="sensor"
              value={formData.sensor}
              onChange={handleInputChange}
            />

            <TextField
              fullWidth
              margin="normal"
              required
              label="Limit Label"
              name="limit_label"
              value={formData.limit_label}
              onChange={handleInputChange}
            />

            <TextField
              fullWidth
              margin="normal"
              required
              label="Equation"
              name="equation"
              value={formData.equation}
              onChange={handleInputChange}
              placeholder="Example: VALUE > 0.3"
            />

            <TextField
              fullWidth
              margin="normal"
              required
              label="Value"
              name="value"
              type="number"
              value={formData.value}
              onChange={handleInputChange}
              inputProps={{ step: "0.001" }}
            />

            <TextField
              fullWidth
              margin="normal"
              label="Comment"
              name="comment"
              value={formData.comment}
              onChange={handleInputChange}
              multiline
              rows={3}
            />

            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
              <Button
                variant="outlined"
                sx={{ mr: 2 }}
                onClick={() => navigate("/alarms")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
              >
                Create Alarm
              </Button>
            </Box>
          </form>
        </Paper>
      </Box>
    </MainContentWrapper>
  );
};

export default AddAlarms;