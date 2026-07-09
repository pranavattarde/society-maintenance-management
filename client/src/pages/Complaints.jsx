/**
 * Complaints list page — implemented in Phase 3 (Complaint Management).
 *
 * Displays a filterable list of complaints.
 * Residents see only their own; admins see all.
 */
export default function Complaints() {
  return (
    <div className="page">
      <div className="page-header">
        <h1>Complaints</h1>
      </div>
      <p className="text-muted">Complaint list with filters — Phase 3</p>
    </div>
  );
}
