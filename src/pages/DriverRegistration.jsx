import React, { useState } from "react";
import api from "../services/api";

const css = `
  

  .dr-root {
    min-height: 100vh;
    background: #f0f4f8;
    font-family: 'Geist', 'DM Sans', sans-serif;
    color: #1a2035;
    padding: 32px;
  }

  .dr-wrap {
    max-width: 820px;
    margin: 0 auto;
  }

  /* PAGE HEADER */
  .dr-page-header { margin-bottom: 28px; }
  .dr-page-header h1 {
    font-size: 1.9rem; font-weight: 800; letter-spacing: -0.03em;
    color: #1a2035; margin-bottom: 4px;
  }
  .dr-page-header p { color: #5e6a85; font-size: 0.9rem; }

  /* CARD */
  .dr-card {
    background: #fff; border-radius: 14px;
    border: 1px solid #e4e9f0;
    box-shadow: 0 2px 8px rgba(0,0,0,.04);
    overflow: hidden; margin-bottom: 16px;
  }

  .dr-section-head {
    display: flex; align-items: center; gap: 10px;
    padding: 18px 24px; border-bottom: 1px solid #f0f4f8;
  }
  .dr-section-icon {
    width: 32px; height: 32px; border-radius: 8px;
    background: linear-gradient(135deg, #1A6EFF22, #00D68F22);
    display: flex; align-items: center; justify-content: center;
    font-size: 1rem; flex-shrink: 0;
  }
  .dr-section-title { font-size: 0.95rem; font-weight: 700; color: #1a2035; }

  .dr-section-body { padding: 20px 24px; }

  /* GRID */
  .dr-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .dr-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
  .dr-col-2  { grid-column: span 2; }

  /* FIELD */
  .dr-field { display: flex; flex-direction: column; gap: 6px; }
  .dr-field label {
    font-size: 0.78rem; font-weight: 600; color: #5e6a85;
    text-transform: uppercase; letter-spacing: .04em;
  }
  .dr-field label span { color: #EF4444; margin-left: 2px; }

  .dr-field input,
  .dr-field select {
    padding: 10px 14px; border: 1.5px solid #e4e9f0; border-radius: 8px;
    font-family: inherit; font-size: 0.9rem; color: #1a2035;
    background: #f8fafc; outline: none;
    transition: border-color .2s, background .2s, box-shadow .2s;
  }
  .dr-field input:focus,
  .dr-field select:focus {
    border-color: #1A6EFF; background: #fff;
    box-shadow: 0 0 0 3px rgba(26,110,255,.12);
  }
  .dr-field input::placeholder { color: #a0aec0; }

  /* SUBMIT CARD */
  .dr-submit-card {
    background: #fff; border-radius: 14px;
    border: 1px solid #e4e9f0;
    box-shadow: 0 2px 8px rgba(0,0,0,.04);
    padding: 24px; display: flex; flex-direction: column; gap: 16px;
  }

  .dr-submit-btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 12px 28px; border-radius: 10px; border: none;
    background: linear-gradient(135deg, #1A6EFF, #00D68F);
    color: #fff; font-family: inherit; font-size: 0.95rem; font-weight: 700;
    cursor: pointer; transition: opacity .2s, transform .2s;
    align-self: flex-start;
  }
  .dr-submit-btn:hover { opacity: .9; transform: translateY(-1px); }

  .dr-submit-note {
    display: flex; gap: 10px; align-items: flex-start;
    background: #f0f8ff; border: 1px solid #bfdbfe; border-radius: 10px;
    padding: 12px 14px; font-size: 0.82rem; color: #3b82f6; line-height: 1.6;
  }
  .dr-note-icon { flex-shrink: 0; margin-top: 1px; }

  /* SUCCESS */
  .dr-success {
    text-align: center; padding: 60px 20px;
  }
  .dr-success-icon { font-size: 3rem; margin-bottom: 16px; }
  .dr-success h2 { font-size: 1.4rem; font-weight: 800; margin-bottom: 8px; }
  .dr-success p  { color: #5e6a85; font-size: 0.9rem; }

  @media (max-width: 640px) {
    .dr-root { padding: 16px; }
    .dr-grid-2, .dr-grid-3 { grid-template-columns: 1fr; }
    .dr-col-2 { grid-column: span 1; }
  }
`;



function DriverRegistration() {
  const [form, setForm] = useState({
    licenseNumber:     "",
    licenseExpiry:     "",
    company:           "",
    plateNumber:       "",
    vehicleModel:      "",
    vehicleYear:       "",
    capacity:          "",
    emergencyName:     "",
    emergencyPhone:    "",
    emergencyRelation: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [dateError, setDateError] = useState("");

  const handleChange = (e) => {
  const { name, value } = e.target;

  if (name === "licenseExpiry") {
    const selectedDate = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Сбрасываем время для чистого сравнения дат

    if (selectedDate < today) {
      setDateError("License has already expired or date is invalid!");
    } else {
      setDateError("");
    }
  }

  setForm({ ...form, [name]: value });
};

  const handleSubmit = async (e) => {
  e.preventDefault();
  
  const userEmail = sessionStorage.getItem("mw_user"); // Получаем email текущего юзера

  try {
    const response = await api.post("/api/drivers/register", {
      ...form,
      email: userEmail
    });

    if (response.status === 201) {
      setSubmitted(true);
    }
  } catch (error) {
    console.error("Registration error:", error);
    alert("Ошибка при регистрации: " + (error.response?.data?.message || error.message));
  }
};

  return (
    <>
      <style>{css}</style>
      <div className="dr-root">
        <div className="dr-wrap">

          {/* PAGE HEADER */}
          <div className="dr-page-header">
            <h1>Driver Registration</h1>
            <p>Register as a driver for medical waste collection</p>
          </div>

          {submitted ? (
            <div className="dr-card">
             <div className="dr-success">
               <div className="dr-success-icon" style={{ fontSize: '4rem' }}>⏳</div>
               <h2 style={{ color: '#1a2035' }}>Application under consideration</h2>
               <p style={{ maxWidth: '400px', margin: '0 auto', lineHeight: '1.6' }}>
                  Your data has been successfully submitted. Account status:
                   <span style={{ 
                     background: '#FFFBEB', 
                     color: '#B45309', 
                     padding: '2px 8px', 
                     borderRadius: '12px', 
                     fontWeight: 'bold',
                     marginLeft: '5px' 
                  }}>
                     PENDING
                   </span>
                 </p>
                <p style={{ marginTop: '20px', fontSize: '0.85rem' }}>
                   The administrator verifies your license and vehicle information.
                   This usually takes up to 24 hours.
                 </p>
                 <button 
                   className="db-btn db-btn-primary" 
                   style={{ marginTop: '24px' }}
                   onClick={() => navigate('/dashboard')}
                 >
                   Return to the control panel
                 </button>
               </div>
            </div>
           ) : (


            <form onSubmit={handleSubmit}>

              {/* LICENSE INFO */}
              <div className="dr-card">
                <div className="dr-section-head">
                  <div className="dr-section-icon"></div>
                  <span className="dr-section-title">Driver's License Information</span>
                </div>
                <div className="dr-section-body">
                  <div className="dr-grid-2">
                    <div className="dr-field">
                      <label>License Number <span>*</span></label>
                      <input type="text" name="licenseNumber" required placeholder="e.g. DL-1234567"
                        value={form.licenseNumber} onChange={handleChange} />
                    </div>
                    <div className="dr-field">
                     <label>License Expiry Date <span>*</span></label>
                     <input 
                       type="date" 
                       name="licenseExpiry" 
                       required
                       style={{ borderColor: dateError ? '#EF4444' : '#e4e9f0' }}
                       value={form.licenseExpiry} 
                       onChange={handleChange} 
                     />
                     {dateError && (
                       <span style={{ color: '#EF4444', fontSize: '0.75rem', marginTop: '4px' }}>
                         {dateError}
                       </span>
                     )}
                   </div>
                    <div className="dr-field dr-col-2">
                      <label>Medical Company <span>*</span></label>
                      <select name="company" required value={form.company} onChange={handleChange}>
                        <option value="">Select a company</option>
                        <option value="cgb">City General Hospital (License: 1234)</option>
                        <option value="university">University Hospital (License: 12341234)</option>
                        <option value="lab">Medical Laboratory (License: 5678)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* VEHICLE INFO */}
              <div className="dr-card">
                <div className="dr-section-head">
                  <div className="dr-section-icon"></div>
                  <span className="dr-section-title">Vehicle Information</span>
                </div>
                <div className="dr-section-body">
                  <div className="dr-grid-2">
                    <div className="dr-field">
                      <label>License Plate <span>*</span></label>
                      <input type="text" name="plateNumber" required placeholder="e.g. ABC-1234"
                        value={form.plateNumber} onChange={handleChange} />
                    </div>
                    <div className="dr-field">
                      <label>Vehicle Model</label>
                      <input type="text" name="vehicleModel" placeholder="e.g. Mercedes Sprinter"
                        value={form.vehicleModel} onChange={handleChange} />
                    </div>
                    <div className="dr-field">
                      <label>Year of Manufacture</label>
                      <input type="number" name="vehicleYear" placeholder="e.g. 2020" min="1990" max="2026"
                        value={form.vehicleYear} onChange={handleChange} />
                    </div>
                    <div className="dr-field">
                      <label>Load Capacity (kg)</label>
                      <input type="number" name="capacity" placeholder="e.g. 1500"
                        value={form.capacity} onChange={handleChange} />
                    </div>
                  </div>
                </div>
              </div>

              {/* EMERGENCY CONTACT */}
              <div className="dr-card">
                <div className="dr-section-head">
                  <div className="dr-section-icon"></div>
                  <span className="dr-section-title">Emergency Contact</span>
                </div>
                <div className="dr-section-body">
                  <div className="dr-grid-3">
                    <div className="dr-field">
                      <label>Full Name</label>
                      <input type="text" name="emergencyName" placeholder="e.g. John Smith"
                        value={form.emergencyName} onChange={handleChange} />
                    </div>
                    <div className="dr-field">
                      <label>Phone Number</label>
                      <input type="tel" name="emergencyPhone" placeholder="+1 234 567 8900"
                        value={form.emergencyPhone} onChange={handleChange} />
                    </div>
                    <div className="dr-field">
                      <label>Relationship</label>
                      <input type="text" name="emergencyRelation" placeholder="e.g. Spouse, Parent"
                        value={form.emergencyRelation} onChange={handleChange} />
                    </div>
                  </div>
                </div>
              </div>

              {/* SUBMIT */}
              <div className="dr-submit-card">
              <button 
                 type="submit" 
                 className="dr-submit-btn" 
                 disabled={!!dateError}
                 style={{ opacity: dateError ? 0.6 : 1, cursor: dateError ? 'not-allowed' : 'pointer' }}
              >
                 Submit Application
              </button>
                <div className="dr-submit-note">
                  <span className="dr-note-icon">ℹ</span>
                  <span>After submitting, an administrator will review the provided information. You will receive an email notification about the status of your application.</span>
                </div>
              </div>

            </form>
          )}

        </div>
      </div>
    </>
  );
}

export default DriverRegistration;