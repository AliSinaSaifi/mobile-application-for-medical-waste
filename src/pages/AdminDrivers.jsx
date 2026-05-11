import React, { useEffect, useState } from "react";
import { getPendingDrivers, updateDriverStatus } from "../services/api";

const AdminDrivers = () => {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await getPendingDrivers();
      setRequests(res.data);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  const handleAction = async (id, status) => {
    try {
      await updateDriverStatus(id, status);
      setRequests((prev) => prev.filter((r) => r._id !== id));
      alert(`Driver ${status}!`);
    } catch (err) {
      console.error(err);
      alert("Action failed: " + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div style={{ padding: '32px', background: '#f8fafc', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '24px' }}>Driver Approval Queue</h1>
      
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e4e9f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: '#f1f5f9', fontSize: '0.8rem', textTransform: 'uppercase' }}>
            <tr>
              <th style={{ padding: '16px' }}>Driver / Email</th>
              <th style={{ padding: '16px' }}>License & Company</th>
              <th style={{ padding: '16px' }}>Vehicle</th>
              <th style={{ padding: '16px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map(req => (
              <tr key={req._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '16px' }}>
                  <div style={{ fontWeight: 600 }}>{req.userId?.email || 'N/A'}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>ID: {req._id.slice(-6)}</div>
                </td>
                <td style={{ padding: '16px' }}>
                  <div>{req.licenseNumber}</div>
                  <div style={{ fontSize: '0.75rem', color: '#1A6EFF' }}>{req.company}</div>
                </td>
                <td style={{ padding: '16px' }}>
                  <div>{req.vehicleModel} ({req.vehicleYear})</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Plate: {req.plateNumber}</div>
                </td>
                <td style={{ padding: '16px' }}>
                  <button 
                    onClick={() => handleAction(req._id, 'approved')}
                    style={{ background: '#00D68F', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', marginRight: '8px', fontWeight: 600 }}
                  > Approve </button>
                  <button 
                    onClick={() => handleAction(req._id, 'rejected')}
                    style={{ background: '#fff', color: '#EF4444', border: '1px solid #EF4444', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                  > Reject </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {requests.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No pending applications. Good job!</div>}
      </div>
    </div>
  );
};

export default AdminDrivers;
