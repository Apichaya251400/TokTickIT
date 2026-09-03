import { useState, useEffect, useRef } from "react";
import {
  checkSystem,
  Category,
  RelatedSystem,
  Requester,
  fetchActiveRequesters,
  fetchCategories,
  fetchRelatedSystems,
  getSelectedRequesterId,
  setSelectedRequesterId,
  fetchMyTickets,
  createTicket,
  uploadAttachment,
} from "./api.js";

type UiState = "idle" | "loading" | "success" | "error";
type NavigationTab = "my-tickets" | "create-ticket";

export interface AttachmentItem {
  id: string;
  file: File;
  status: "pending" | "uploading" | "succeeded" | "failed";
}

export default function App() {
  // 1. Lab 1 state (Top level of App component)
  const [lab1State, setLab1State] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  const [lab1ErrorMessage, setLab1ErrorMessage] = useState<string>("");

  // 2. Lab 2 Requester Context & Selector state (Top level of App component)
  const [requestersLoading, setRequestersLoading] = useState<boolean>(true);
  const [requestersError, setRequestersError] = useState<string | null>(null);
  const [activeRequesters, setActiveRequesters] = useState<Requester[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentRequester, setCurrentRequester] = useState<Requester | null>(null);
  const [isSelecting, setIsSelecting] = useState<boolean>(true);

  // 3. Navigation Tab state (Top level of App component)
  const [activeTab, setActiveTab] = useState<NavigationTab>("my-tickets");

  // 4. Requester ticket data state & request tracker ref (Top level of App component)
  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState<boolean>(false);
  const latestTicketRequestIdRef = useRef<number>(0);

  // 5. Create Ticket Reference Data State
  const [formCategories, setFormCategories] = useState<Category[]>([]);
  const [formRelatedSystems, setFormRelatedSystems] = useState<RelatedSystem[]>([]);
  const [refDataLoading, setRefDataLoading] = useState<boolean>(false);
  const [refDataError, setRefDataError] = useState<string | null>(null);

  // 6. Create Ticket Form State
  const [categoryId, setCategoryId] = useState<string>("");
  const [relatedSystemId, setRelatedSystemId] = useState<string>("");
  const [requestedPriority, setRequestedPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [summary, setSummary] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [attachmentItems, setAttachmentItems] = useState<AttachmentItem[]>([]);

  // 7. Retained Created Ticket State for Attachment Retry (BR-18 Duplicate Ticket Protection)
  const [retainedCreatedTicket, setRetainedCreatedTicket] = useState<{ id: string; ticketNumber: string } | null>(null);

  // 8. Create Ticket Validation & Feedback State
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [systemError, setSystemError] = useState<string | null>(null);
  const [dropzoneError, setDropzoneError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);
  const [createdTicketSuccess, setCreatedTicketSuccess] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const submitLockRef = useRef<boolean>(false);

  // Startup Effect
  useEffect(() => {
    loadRequestersAndRestoreContext();
  }, []);

  // Fetch reference data when switching to Create Ticket tab
  useEffect(() => {
    if (activeTab === "create-ticket" && formCategories.length === 0) {
      loadReferenceData();
    }
  }, [activeTab]);

  async function loadReferenceData() {
    setRefDataLoading(true);
    setRefDataError(null);
    try {
      const [cats, systems] = await Promise.all([fetchCategories(), fetchRelatedSystems()]);
      setFormCategories(cats);
      setFormRelatedSystems(systems);
    } catch (err: any) {
      setRefDataError("Unable to load ticket reference data. Please try again.");
    } finally {
      setRefDataLoading(false);
    }
  }

  async function loadRequestersAndRestoreContext() {
    setRequestersLoading(true);
    setRequestersError(null);

    try {
      const requesters = await fetchActiveRequesters();
      setActiveRequesters(requesters);

      const storedId = getSelectedRequesterId();

      // Validate stored ID against active requesters list
      if (storedId) {
        const found = requesters.find((r) => String(r.id) === String(storedId) && r.isActive !== false);
        if (found) {
          setCurrentRequester(found);
          setIsSelecting(false);
          loadTicketsForRequester(String(found.id));
        } else {
          // Invalid, unknown, or inactive stored ID -> require selection
          setSelectedRequesterId(null);
          setCurrentRequester(null);
          setIsSelecting(true);
        }
      } else {
        setIsSelecting(true);
      }
    } catch (err: any) {
      setRequestersError(err?.message || "Unable to load requesters. Please check your connection.");
      setIsSelecting(true);
    } finally {
      setRequestersLoading(false);
    }
  }

  // Explicit requester context passed down with concurrency race protection
  async function loadTicketsForRequester(requesterId: string) {
    const requestId = ++latestTicketRequestIdRef.current;
    setTicketsLoading(true);
    try {
      const res = await fetchMyTickets(requesterId);
      if (requestId === latestTicketRequestIdRef.current) {
        setTickets(res?.data || []);
      }
    } catch (err) {
      if (requestId === latestTicketRequestIdRef.current) {
        setTickets([]);
      }
    } finally {
      if (requestId === latestTicketRequestIdRef.current) {
        setTicketsLoading(false);
      }
    }
  }

  function handleSelectRequester(id: string) {
    setSelectedId(id);
  }

  function handleContinue() {
    if (!selectedId) return;

    const chosen = activeRequesters.find((r) => String(r.id) === String(selectedId));
    if (chosen) {
      setSelectedRequesterId(String(chosen.id));
      setCurrentRequester(chosen);
      setIsSelecting(false);
      // ISSUE #3: Clear all previous ticket/attachment retry state when requester context changes
      resetFormFields();
      setCreatedTicketSuccess(null);
      setUploadWarning(null);
      setSubmitError(null);
      loadTicketsForRequester(String(chosen.id));
    }
  }

  function handleChangeRequester() {
    setIsSelecting(true);
    setSelectedId(currentRequester ? String(currentRequester.id) : null);
    // ISSUE #3: Clear all previous ticket/attachment retry state when user changes requester
    resetFormFields();
    setCreatedTicketSuccess(null);
    setUploadWarning(null);
    setSubmitError(null);
  }

  // Lab 1 handler
  async function handleCheckSystem() {
    setLab1State("loading");
    setLab1ErrorMessage("");
    try {
      const res = await checkSystem();
      setCategories(res.categories);
      setLab1State("success");
    } catch (err: any) {
      setLab1ErrorMessage(err?.message || "Unable to connect to the server. Please check your connection and try again.");
      setLab1State("error");
    }
  }

  // Form Field Change Handlers with Validation
  function handleSummaryChange(val: string) {
    setSummary(val);
    const trimmed = val.trim();
    if (val.length > 0 && trimmed.length < 10) {
      setSummaryError("Summary must be at least 10 characters.");
    } else if (trimmed.length > 120) {
      setSummaryError("Summary cannot exceed 120 characters.");
    } else {
      setSummaryError(null);
    }
  }

  function handleDescriptionChange(val: string) {
    setDescription(val);
    const trimmed = val.trim();
    if (val.length > 0 && trimmed.length < 20) {
      setDescriptionError("Description must be at least 20 characters.");
    } else if (trimmed.length > 2000) {
      setDescriptionError("Description cannot exceed 2000 characters.");
    } else {
      setDescriptionError(null);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setDropzoneError(null);
    if (!e.target.files || e.target.files.length === 0) return;

    const filesArray = Array.from(e.target.files);

    // Check active attachment limit (max 5)
    if (attachmentItems.length + filesArray.length > 5) {
      setDropzoneError("Maximum of 5 active attachments allowed.");
      return;
    }

    const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];

    for (const file of filesArray) {
      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        setDropzoneError(`File "${file.name}" is invalid. Allowed types: JPG, PNG, WEBP, PDF under 5 MB.`);
        return;
      }

      if (file.size > 5_000_000) {
        setDropzoneError("File exceeds maximum allowed size of 5 MB (5,000,000 bytes).");
        return;
      }
    }

    const newItems: AttachmentItem[] = filesArray.map((file, idx) => ({
      id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${idx}`,
      file,
      status: "pending",
    }));

    setAttachmentItems((prev) => [...prev, ...newItems]);
  }

  function handleRemoveFile(id: string) {
    setAttachmentItems((prev) => prev.filter((item) => item.id !== id));
  }

  function validateForm(): boolean {
    let isValid = true;
    const trimmedSummary = summary.trim();
    const trimmedDescription = description.trim();

    if (!categoryId) {
      setCategoryError("Category is required.");
      isValid = false;
    } else {
      setCategoryError(null);
    }

    if (!relatedSystemId) {
      setSystemError("Related System is required.");
      isValid = false;
    } else {
      setSystemError(null);
    }

    if (trimmedSummary.length < 10) {
      setSummaryError("Summary must be at least 10 characters.");
      isValid = false;
    } else if (trimmedSummary.length > 120) {
      setSummaryError("Summary cannot exceed 120 characters.");
      isValid = false;
    } else {
      setSummaryError(null);
    }

    if (trimmedDescription.length < 20) {
      setDescriptionError("Description must be at least 20 characters.");
      isValid = false;
    } else if (trimmedDescription.length > 2000) {
      setDescriptionError("Description cannot exceed 2000 characters.");
      isValid = false;
    } else {
      setDescriptionError(null);
    }

    return isValid;
  }

  async function handleCreateTicketSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (submitLockRef.current || isSubmitting) return;

    // ISSUE #1: Guard submission if reference data is loading, failed, or empty
    if (refDataLoading || Boolean(refDataError) || formCategories.length === 0 || formRelatedSystems.length === 0) {
      return;
    }

    // Capture requester context ID at invocation start to protect against context switching races
    const capturedRequesterId = getSelectedRequesterId() || String(currentRequester?.id);

    submitLockRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);
    setUploadWarning(null);
    setCreatedTicketSuccess(null);

    try {
      let activeTicket = retainedCreatedTicket;

      // If ticket has not been created yet, perform validation and createTicket API call
      if (!activeTicket) {
        if (!validateForm()) {
          submitLockRef.current = false;
          setIsSubmitting(false);
          return;
        }

        const payload = {
          categoryId: Number(categoryId),
          relatedSystemId: Number(relatedSystemId),
          requestedPriority,
          summary: summary.trim(),
          description: description.trim(),
        };

        const newTicket = await createTicket(payload, capturedRequesterId);
        const ticketNum = newTicket?.ticketNumber || newTicket?.data?.ticketNumber;
        const ticketId = newTicket?.id || newTicket?.data?.id;

        // FIX 2: Require valid backend-generated ticketNumber and ticketId (no hard-coded fallbacks)
        if (!ticketNum || typeof ticketNum !== "string" || !ticketId) {
          throw new Error("Invalid ticket response from server: missing ticketNumber or id");
        }

        activeTicket = { id: String(ticketId), ticketNumber: String(ticketNum) };
      }

      // Attempt attachment uploads if files were selected
      if (attachmentItems.length > 0) {
        let hasUploadError = false;

        // Select ONLY items that have NOT succeeded yet (pending or failed)
        const itemsToUpload = attachmentItems.filter((item) => item.status !== "succeeded");

        for (const item of itemsToUpload) {
          try {
            // Mark item as uploading in state
            setAttachmentItems((prev) =>
              prev.map((i) => (i.id === item.id ? { ...i, status: "uploading" } : i))
            );

            await uploadAttachment(activeTicket.id, item.file, capturedRequesterId);

            // Mark item as succeeded in state
            setAttachmentItems((prev) =>
              prev.map((i) => (i.id === item.id ? { ...i, status: "succeeded" } : i))
            );
          } catch (uploadErr) {
            hasUploadError = true;

            // Mark item as failed in state
            setAttachmentItems((prev) =>
              prev.map((i) => (i.id === item.id ? { ...i, status: "failed" } : i))
            );
          }
        }

        if (hasUploadError) {
          // Retain created ticket for retry so createTicket is NOT called again on retry
          setRetainedCreatedTicket(activeTicket);
          setUploadWarning(`Ticket ${activeTicket.ticketNumber} saved, but attachment upload failed.`);
        } else {
          setCreatedTicketSuccess({ id: activeTicket.id, ticketNumber: activeTicket.ticketNumber });
          resetFormFields();
        }
      } else {
        setCreatedTicketSuccess({ id: activeTicket.id, ticketNumber: activeTicket.ticketNumber });
        resetFormFields();
      }
    } catch (err: any) {
      // Display safe error banner without exposing internal server details (BR-15, AC-14, UI-03)
      setSubmitError("Failed to create ticket. Please try again.");
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  }

  function resetFormFields() {
    setCategoryId("");
    setRelatedSystemId("");
    setRequestedPriority("MEDIUM");
    setSummary("");
    setDescription("");
    setAttachmentItems([]);
    setRetainedCreatedTicket(null);
    setSummaryError(null);
    setDescriptionError(null);
    setCategoryError(null);
    setSystemError(null);
    setDropzoneError(null);
  }

  // Render Requester Selection View
  if (isSelecting) {
    return (
      <div className="container py-5" style={{ maxWidth: 640 }}>
        <header className="mb-4">
          <h1 className="h3">
            TokTickIT <span className="text-success">IT Service Desk</span>
          </h1>
          <h2 className="h4 text-success fw-bold mt-3">Select Development Requester</h2>
          <p className="text-muted small">
            Select a Development Requester for Lab 2 testing context. This selector attaches the{" "}
            <code>X-Requester-Id</code> header to API requests (this is for development testing context, not user authentication).
          </p>
        </header>

        {requestersLoading && (
          <div className="alert alert-info" role="status">
            Loading active requesters…
          </div>
        )}

        {requestersError && (
          <div className="alert alert-danger" role="alert">
            {requestersError}
          </div>
        )}

        {!requestersLoading && !requestersError && activeRequesters.length === 0 && (
          <div className="alert alert-warning" role="alert">
            No active requesters available.
          </div>
        )}

        {!requestersLoading && !requestersError && activeRequesters.length > 0 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleContinue();
            }}
          >
            <div className="card mb-4 shadow-sm">
              <div className="card-header bg-light fw-semibold">Available Development Requesters</div>
              <div className="list-group list-group-flush">
                {activeRequesters.map((req) => {
                  const isChecked = selectedId === String(req.id);
                  return (
                    <label
                      key={req.id}
                      className={`list-group-item list-group-item-action d-flex align-items-center justify-content-between p-3 ${
                        isChecked ? "active bg-success text-white" : ""
                      }`}
                      style={{ cursor: "pointer" }}
                    >
                      <div className="d-flex align-items-center">
                        <input
                          type="radio"
                          name="requester"
                          id={`requester-${req.id}`}
                          aria-label={req.name}
                          value={req.id}
                          checked={isChecked}
                          onChange={() => handleSelectRequester(String(req.id))}
                          className="form-check-input me-3"
                        />
                        <div>
                          <div className="fw-bold">{req.name}</div>
                          <div className={`small ${isChecked ? "text-white-50" : "text-muted"}`}>{req.email}</div>
                        </div>
                      </div>
                      <span className={`badge ${isChecked ? "bg-light text-dark" : "bg-secondary"}`}>ID: {req.id}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="d-grid">
              <button
                type="submit"
                className="btn btn-success btn-lg"
                disabled={!selectedId}
              >
                Continue
              </button>
            </div>
          </form>
        )}

        {/* Lab 1 System Check Panel */}
        <section className="border-top pt-4 mt-5">
          <button className="btn btn-success mb-3" onClick={handleCheckSystem} disabled={lab1State === "loading"}>
            {lab1State === "loading" ? "Loading…" : "Check System"}
          </button>

          {lab1State === "success" && (
            <div className="mt-2">
              <p className="fw-bold mb-2">
                System Status: <span className="text-success">Online</span>
              </p>
              <ol className="list-group list-group-numbered">
                {categories.map((cat) => (
                  <li key={cat.id} className="list-group-item">
                    {cat.name}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {lab1State === "error" && (
            <div className="mt-2">
              <p className="fw-bold text-danger mb-1">System Status: Offline</p>
              <p className="text-muted">{lab1ErrorMessage || "Unable to connect to the server."}</p>
            </div>
          )}
        </section>
      </div>
    );
  }

  // Render Application Shell with Selected Requester Context & Navigation Tabs
  return (
    <div className="container py-5" style={{ maxWidth: 800 }}>
      {/* App Shell Header displaying Current Requester Identity, Dev Mode Badge & Change Requester button */}
      <nav className="navbar navbar-light bg-light rounded p-3 mb-4 d-flex flex-wrap align-items-center justify-content-between gap-2 border">
        <div>
          <div className="d-flex align-items-center flex-wrap gap-2">
            <span className="text-muted">Current Requester:</span>
            <span className="fw-bold text-success fs-5">{currentRequester?.name}</span>
            <span className="badge bg-secondary">ID: {currentRequester?.id}</span>
            {/* ISSUE #4: Development Mode - Testing Context Only Badge */}
            <span className="badge bg-warning text-dark border ms-1">
              Development Mode - Testing Context Only
            </span>
          </div>
        </div>
        <button className="btn btn-outline-secondary btn-sm" onClick={handleChangeRequester}>
          Change Requester
        </button>
      </nav>

      {/* Main Application Shell Title & Logo */}
      <header className="mb-4">
        <h1 className="h3">
          TokTickIT <span className="text-success">IT Service Desk</span>
        </h1>
      </header>

      {/* Application Shell Navigation Tabs (docs/lab-02/ui-spec.md §3.1) */}
      <ul className="nav nav-tabs mb-4" role="tablist">
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${activeTab === "my-tickets" ? "active fw-bold text-success" : "text-secondary"}`}
            aria-current={activeTab === "my-tickets" ? "page" : undefined}
            onClick={() => setActiveTab("my-tickets")}
          >
            My Tickets
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${activeTab === "create-ticket" ? "active fw-bold text-success" : "text-secondary"}`}
            aria-current={activeTab === "create-ticket" ? "page" : undefined}
            onClick={() => setActiveTab("create-ticket")}
          >
            Create Ticket
          </button>
        </li>
      </ul>

      {/* Tab Content 1: My Tickets Screen View */}
      {activeTab === "my-tickets" && (
        <section className="mb-5">
          <h2 className="h5 mb-3 fw-bold">My Tickets</h2>
          {ticketsLoading ? (
            <div className="text-muted">Loading tickets…</div>
          ) : tickets.length > 0 ? (
            <ul className="list-group">
              {tickets.map((t) => (
                <li key={t.id} className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <div className="fw-bold">{t.summary}</div>
                    <div className="small text-muted">{t.ticketNumber}</div>
                  </div>
                  <span className="badge bg-primary">{t.requestedPriority}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-muted italic">No tickets found.</div>
          )}
        </section>
      )}

      {/* Tab Content 2: Create Ticket Screen View (Issue #28 Production Form Implementation) */}
      {activeTab === "create-ticket" && (
        <section className="mb-5">
          <h2 className="h5 mb-3 fw-bold">Create IT Support Ticket</h2>

          {/* ISSUE #1: Reference Data Loading Indicator */}
          {refDataLoading && (
            <div className="alert alert-info mb-4" role="status">
              Loading ticket reference data…
            </div>
          )}

          {/* ISSUE #1: Reference Data Error Banner */}
          {refDataError && (
            <div className="alert alert-danger mb-4" role="alert">
              {refDataError}
            </div>
          )}

          {/* ISSUE #2: Success Banner with "Create Another Ticket" Action */}
          {createdTicketSuccess && (
            <div className="alert alert-success mb-4 d-flex flex-column gap-2" role="alert" style={{ backgroundColor: "#EAF6EF", borderColor: "#006B3C", color: "#006B3C" }}>
              <div>Ticket {createdTicketSuccess.ticketNumber} created successfully!</div>
              <div>
                <button
                  type="button"
                  className="btn btn-outline-success btn-sm mt-1"
                  onClick={() => {
                    resetFormFields();
                    setCreatedTicketSuccess(null);
                  }}
                  style={{ borderColor: "#006B3C", color: "#006B3C" }}
                >
                  Create Another Ticket
                </button>
              </div>
            </div>
          )}

          {/* Warning Banner for Attachment Upload Failure */}
          {uploadWarning && (
            <div className="alert alert-warning mb-4" role="alert" style={{ color: "#F59E0B", borderColor: "#F59E0B" }}>
              {uploadWarning}
            </div>
          )}

          {/* Server API Error Banner */}
          {submitError && (
            <div className="alert alert-danger mb-4" role="alert" style={{ color: "#B42318" }}>
              {submitError}
            </div>
          )}

          <form onSubmit={handleCreateTicketSubmit} noValidate aria-label="Create Ticket Form">
            {/* Read-Only Information Card */}
            <div className="card mb-4 bg-light shadow-sm">
              <div className="card-header bg-light fw-semibold">Ticket Context Metadata</div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-12 col-md-4">
                    <label htmlFor="ticketNumber" className="form-label small text-muted">Ticket Number</label>
                    <input
                      type="text"
                      id="ticketNumber"
                      aria-label="Ticket Number"
                      className="form-control form-control-sm"
                      value="Auto-generated after submission"
                      readOnly
                      aria-readonly="true"
                      style={{ backgroundColor: "#F0F4F2" }}
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label htmlFor="createdDate" className="form-label small text-muted">Created Date</label>
                    <input
                      type="text"
                      id="createdDate"
                      aria-label="Created Date"
                      className="form-control form-control-sm"
                      value="Current Timestamp"
                      readOnly
                      aria-readonly="true"
                      style={{ backgroundColor: "#F0F4F2" }}
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label htmlFor="requesterName" className="form-label small text-muted">Requester</label>
                    <input
                      type="text"
                      id="requesterName"
                      aria-label="Requester"
                      className="form-control form-control-sm"
                      value={currentRequester?.name || "Selected Requester"}
                      readOnly
                      aria-readonly="true"
                      style={{ backgroundColor: "#F0F4F2" }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Main Ticket Input Fields */}
            <div className="row g-3 mb-4">
              {/* Category Select */}
              <div className="col-12 col-md-6">
                <label htmlFor="category" className="form-label fw-semibold">
                  Category <span style={{ color: "#B42318" }}>*</span>
                </label>
                <select
                  id="category"
                  aria-label="Category"
                  aria-required="true"
                  className={`form-select ${categoryError ? "is-invalid" : ""}`}
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  style={{ outlineColor: "#0B7A46" }}
                  disabled={refDataLoading || Boolean(refDataError)}
                >
                  <option value="">Select Category</option>
                  {formCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {categoryError && (
                  <div className="invalid-feedback d-block mt-1" style={{ color: "#B42318" }}>
                    {categoryError}
                  </div>
                )}
              </div>

              {/* Related System Select */}
              <div className="col-12 col-md-6">
                <label htmlFor="relatedSystem" className="form-label fw-semibold">
                  Related System <span style={{ color: "#B42318" }}>*</span>
                </label>
                <select
                  id="relatedSystem"
                  aria-label="Related System"
                  aria-required="true"
                  className={`form-select ${systemError ? "is-invalid" : ""}`}
                  value={relatedSystemId}
                  onChange={(e) => setRelatedSystemId(e.target.value)}
                  style={{ outlineColor: "#0B7A46" }}
                  disabled={refDataLoading || Boolean(refDataError)}
                >
                  <option value="">Select Related System</option>
                  {formRelatedSystems.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {systemError && (
                  <div className="invalid-feedback d-block mt-1" style={{ color: "#B42318" }}>
                    {systemError}
                  </div>
                )}
              </div>

              {/* Requested Priority Selection */}
              <div className="col-12">
                <label className="form-label fw-semibold">
                  Requested Priority <span style={{ color: "#B42318" }}>*</span>
                </label>
                <div className="d-flex flex-wrap gap-3 mt-1">
                  {(["LOW", "MEDIUM", "HIGH", "URGENT"] as const).map((p) => (
                    <label key={p} className="form-check form-check-inline cursor-pointer">
                      <input
                        type="radio"
                        name="requestedPriority"
                        value={p}
                        checked={requestedPriority === p}
                        onChange={() => setRequestedPriority(p)}
                        className="form-check-input me-2"
                        style={{ outlineColor: "#0B7A46" }}
                      />
                      <span className={`badge ${requestedPriority === p ? "bg-success text-white" : "bg-light text-dark border"}`}>
                        {p}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Ticket Summary */}
              <div className="col-12">
                <div className="d-flex justify-content-between align-items-center">
                  <label htmlFor="summary" className="form-label fw-semibold">
                    Summary <span style={{ color: "#B42318" }}>*</span>
                  </label>
                  <span className="small text-muted">{summary.length} / 120</span>
                </div>
                <input
                  type="text"
                  id="summary"
                  aria-label="Summary"
                  aria-required="true"
                  className={`form-control ${summaryError ? "is-invalid" : ""}`}
                  value={summary}
                  onChange={(e) => handleSummaryChange(e.target.value)}
                  placeholder="Brief summary of the issue (10–120 characters)"
                  style={{ outlineColor: "#0B7A46" }}
                />
                {summaryError && (
                  <div className="invalid-feedback d-block mt-1" style={{ color: "#B42318" }}>
                    {summaryError}
                  </div>
                )}
              </div>

              {/* Ticket Description */}
              <div className="col-12">
                <div className="d-flex justify-content-between align-items-center">
                  <label htmlFor="description" className="form-label fw-semibold">
                    Description <span style={{ color: "#B42318" }}>*</span>
                  </label>
                  <span className="small text-muted">{description.length} / 2000</span>
                </div>
                <textarea
                  id="description"
                  aria-label="Description"
                  aria-required="true"
                  rows={5}
                  className={`form-control ${descriptionError ? "is-invalid" : ""}`}
                  value={description}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  placeholder="Detailed description of the issue (20–2000 characters)"
                  style={{ outlineColor: "#0B7A46" }}
                />
                {descriptionError && (
                  <div className="invalid-feedback d-block mt-1" style={{ color: "#B42318" }}>
                    {descriptionError}
                  </div>
                )}
              </div>

              {/* Attachment Upload Dropzone */}
              <div className="col-12">
                <label htmlFor="attachments" className="form-label fw-semibold">
                  Attach Files <span className="text-muted fw-normal">(Optional, max 5 files, up to 5 MB each)</span>
                </label>
                <div className="p-3 border rounded bg-light text-center position-relative">
                  <input
                    type="file"
                    id="attachments"
                    aria-label="Attach Files"
                    multiple
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    onChange={handleFileSelect}
                    className="form-control"
                    style={{ outlineColor: "#0B7A46" }}
                  />
                  <div className="small text-muted mt-2">Allowed types: JPG, PNG, WEBP, PDF under 5 MB</div>
                </div>
                {dropzoneError && (
                  <div className="invalid-feedback d-block mt-1" style={{ color: "#B42318" }}>
                    {dropzoneError}
                  </div>
                )}

                {/* Selected File List Preview */}
                {attachmentItems.length > 0 && (
                  <ul className="list-group mt-2">
                    {attachmentItems.map((item) => (
                      <li key={item.id} className="list-group-item d-flex justify-content-between align-items-center p-2 small">
                        <span>
                          {item.file.name} ({(item.file.size / 1024).toFixed(1)} KB)
                          {item.status === "succeeded" && <span className="badge bg-success ms-2">Uploaded</span>}
                          {item.status === "failed" && <span className="badge bg-danger ms-2">Upload Failed</span>}
                        </span>
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm py-0 px-2"
                          onClick={() => handleRemoveFile(item.id)}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Submit Action Controls */}
            <div className="d-flex justify-content-end gap-2 border-top pt-4">
              <button
                type="submit"
                className="btn btn-success btn-lg px-4"
                disabled={isSubmitting || refDataLoading || Boolean(refDataError) || formCategories.length === 0 || formRelatedSystems.length === 0}
                style={{ backgroundColor: "#006B3C", borderColor: "#006B3C", outlineColor: "#0B7A46" }}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Submitting ticket…
                  </>
                ) : (
                  "Submit Ticket"
                )}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Lab 1 System Check Panel */}
      <section className="border-top pt-4">
        <button className="btn btn-success mb-3" onClick={handleCheckSystem} disabled={lab1State === "loading"}>
          {lab1State === "loading" ? "Loading…" : "Check System"}
        </button>

        {lab1State === "success" && (
          <div className="mt-2">
            <p className="fw-bold mb-2">
              System Status: <span className="text-success">Online</span>
            </p>
            <ol className="list-group list-group-numbered">
              {categories.map((cat) => (
                <li key={cat.id} className="list-group-item">
                  {cat.name}
                </li>
              ))}
            </ol>
          </div>
        )}

        {lab1State === "error" && (
          <div className="mt-2">
            <p className="fw-bold text-danger mb-1">System Status: Offline</p>
            <p className="text-muted">{lab1ErrorMessage || "Unable to connect to the server."}</p>
          </div>
        )}
      </section>
    </div>
  );
}
