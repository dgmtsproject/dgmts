import React, { useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import HeaNavLogo from "../components/HeaNavLogo";

interface Instrument {
  description: string;
  location: string;
  id: string;
}

interface User {
  name: string;
  email: string;
}

const ProjectForm: React.FC = () => {
  const [projectName, setProjectName] = useState("");
  const [projectLocation, setProjectLocation] = useState("");
  const [client, setClient] = useState("");
  const [pocName, setPocName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [permissions, setPermissions] = useState({
    accessToSite: false,
    alarm: false,
    viewDataOnly: false,
    downloadDataOnly: false,
    viewGraphOnly: false,
  });

  const [newInstrument, setNewInstrument] = useState<Instrument>({
    description: "",
    location: "",
    id: "",
  });
  const [newUser, setNewUser] = useState<User>({ name: "", email: "" });

  const handleAddInstrument = () => {
    if (
      !newInstrument.description ||
      !newInstrument.location ||
      !newInstrument.id
    ) {
      toast.error("Please fill all instrument fields");
      return;
    }
    setInstruments([...instruments, newInstrument]);
    setNewInstrument({ description: "", location: "", id: "" });
  };

  const handleAddUser = () => {
    if (!newUser.name || !newUser.email) {
      toast.error("Please fill all user fields");
      return;
    }
    setUsers([...users, newUser]);
    setNewUser({ name: "", email: "" });
  };

  const handleSubmit = () => {
    if (
      !projectName ||
      !projectLocation ||
      !client ||
      !pocName ||
      !phone ||
      !email
    ) {
      toast.error("Please fill in all project details");
      return;
    }

    const formData = {
      projectName,
      projectLocation,
      client,
      pocName,
      phone,
      email,
      instruments,
      users,
      permissions,
    };

    console.log("Form Data:", formData);
    toast.success("Project form submitted successfully");
  };

  return (
    <>
      <HeaNavLogo />
      <div style={styles.formContainer}>
        <ToastContainer />
        <h2 style={styles.heading}>Project Form</h2>

        <div style={styles.row}>
          <div style={styles.formSection}>
            <label style={styles.label}>Project Name</label>
            <input
              style={styles.inputField}
              type="text"
              placeholder="Project Name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
            <input
              style={styles.inputField}
              type="text"
              placeholder="Project Location"
              value={projectLocation}
              onChange={(e) => setProjectLocation(e.target.value)}
            />
            <input
              style={styles.inputField}
              type="text"
              placeholder="Client"
              value={client}
              onChange={(e) => setClient(e.target.value)}
            />
            <input
              style={styles.inputField}
              type="text"
              placeholder="POC Name"
              value={pocName}
              onChange={(e) => setPocName(e.target.value)}
            />
            <input
              style={styles.inputField}
              type="text"
              placeholder="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <input
              style={styles.inputField}
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div style={styles.formSection}>
            <h3>Add Instrument</h3>
            <input
              style={styles.inputField}
              type="text"
              placeholder="Description"
              value={newInstrument.description}
              onChange={(e) =>
                setNewInstrument({
                  ...newInstrument,
                  description: e.target.value,
                })
              }
            />
            <input
              style={styles.inputField}
              type="text"
              placeholder="Location"
              value={newInstrument.location}
              onChange={(e) =>
                setNewInstrument({ ...newInstrument, location: e.target.value })
              }
            />
            <input
              style={styles.inputField}
              type="text"
              placeholder="ID"
              value={newInstrument.id}
              onChange={(e) =>
                setNewInstrument({ ...newInstrument, id: e.target.value })
              }
            />
            <button style={styles.submitBtn} onClick={handleAddInstrument}>
              Add Instrument
            </button>
          </div>
        </div>

        <div style={styles.row}>
          <div style={styles.formSection}>
            <h3>Add User</h3>
            <input
              style={styles.inputField}
              type="text"
              placeholder="Name"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
            />
            <input
              style={styles.inputField}
              type="email"
              placeholder="Email"
              value={newUser.email}
              onChange={(e) =>
                setNewUser({ ...newUser, email: e.target.value })
              }
            />
            <button style={styles.submitBtn} onClick={handleAddUser}>
              Add User
            </button>
          </div>

          <div style={styles.formSection}>
            <h3>Permissions</h3>
            <select
              style={styles.inputField}
              onChange={(e) =>
                setPermissions({
                  ...permissions,
                  accessToSite: e.target.value === "yes",
                })
              }
            >
              <option value="no">Select Permission</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={permissions.accessToSite}
                onChange={(e) =>
                  setPermissions({
                    ...permissions,
                    accessToSite: e.target.checked,
                  })
                }
              />
              Access to Site
            </label>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={permissions.alarm}
                onChange={(e) =>
                  setPermissions({ ...permissions, alarm: e.target.checked })
                }
              />
              Alarm
            </label>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={permissions.viewDataOnly}
                onChange={(e) =>
                  setPermissions({
                    ...permissions,
                    viewDataOnly: e.target.checked,
                  })
                }
              />
              View Data Only
            </label>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={permissions.downloadDataOnly}
                onChange={(e) =>
                  setPermissions({
                    ...permissions,
                    downloadDataOnly: e.target.checked,
                  })
                }
              />
              Download Data Only
            </label>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={permissions.viewGraphOnly}
                onChange={(e) =>
                  setPermissions({
                    ...permissions,
                    viewGraphOnly: e.target.checked,
                  })
                }
              />
              View Graph Only
            </label>
          </div>
        </div>

        <button style={styles.submitBtnn} onClick={handleSubmit}>
          Submit Project
        </button>
      </div>
    </>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  formContainer: {
    padding: "20px",
    maxWidth: "1200px",
    margin: "auto",
    fontFamily: "Arial, sans-serif",
  },
  heading: {
    textAlign: "center",
    marginBottom: "30px",
    color: "#333",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    gap: "20px",
    marginBottom: "20px",
  },
  formSection: {
    border: "1px solid #ddd",
    padding: "20px",
    borderRadius: "8px",
    flex: 1,
    boxSizing: "border-box",
    backgroundColor: "#f9f9f9",
  },
  inputField: {
    width: "80%",
    padding: "10px",
    margin: "10px 0",
    borderRadius: "5px",
    border: "1px solid #ccc",
    fontSize: "16px",
  },
  submitBtnn: {
    backgroundColor: "#4CAF50",
    color: "white",
    padding: "12px 20px",
    borderRadius: "5px",
    border: "none",
    fontSize: "16px",
    cursor: "pointer",
    marginLeft: "auto", // This will apply margin to the left and push the button to the center
    marginRight: "auto", // This ensures it's also centered by making the right margin equal
    display: "block", // Ensures the button takes a block layout, allowing margins to work
    width: "200px", // Op},
  },
  submitBtn: {
    backgroundColor: "#4CAF50",
    color: "white",
    padding: "12px 20px",
    borderRadius: "5px",
    border: "none",
    fontSize: "16px",
    cursor: "pointer",
  },
  checkboxLabel: {
    display: "block",
    marginBottom: "8px",
    fontSize: "16px",
  },
  label: {
    fontSize: "16px",
    marginBottom: "8px",
  },
};

export default ProjectForm;
