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
  fetchTicketById,
  createTicket,
  uploadAttachment,
  downloadAttachment,
  softRemoveAttachment,
} from "./api.js";

type UiState = "idle" | "loading" | "success" | "error";
type NavigationTab = "my-tickets" | "create-ticket";

export interface AttachmentItem {
  id: string;
  file: File;
  status: "pending" | "uploading" | "succeeded" | "failed";
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? "N/A" : d.toLocaleDateString();
}

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? "N/A" : d.toLocaleString();
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

  // 3. Navigation Tab & Ticket Detail Selection State
  const [activeTab, setActiveTab] = useState<NavigationTab>("my-tickets");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // 4. My Tickets Query & Data State (Issue #29)
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterCategoryId, setFilterCategoryId] = useState<string>("");
  const [filterRelatedSystemId, setFilterRelatedSystemId] = useState<string>("");
  const [filterRequestedPriority, setFilterRequestedPriority] = useState<string>("");
  const [filterCurrentStatus, setFilterCurrentStatus] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<string>("desc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const [tickets, setTickets] = useState<any[]>([]);
  const [pagination, setPagination] = useState<{
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  }>({ page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
  const [ticketsLoading, setTicketsLoading] = useState<boolean>(false);
  const [ticketsError, setTicketsError] = useState<string | null>(null);
  const latestTicketRequestIdRef = useRef<number>(0);

  // 5. Ticket Detail & Attachment Management State (Issue #29)
  const [detailTicket, setDetailTicket] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const latestDetailRequestIdRef = useRef<number>(0);

  // Soft Removal Modal State
  const [removalTargetAttachment, setRemovalTargetAttachment] = useState<any | null>(null);
  const [removalReason, setRemovalReason] = useState<string>("");
  const [removalReasonError, setRemovalReasonError] = useState<string | null>(null);
  const [isSubmittingRemoval, setIsSubmittingRemoval] = useState<boolean>(false);

  // 6. Create Ticket Reference Data State
  const [formCategories, setFormCategories] = useState<Category[]>([]);
  const [formRelatedSystems, setFormRelatedSystems] = useState<RelatedSystem[]>([]);
  const [refDataLoading, setRefDataLoading] = useState<boolean>(false);
  const [refDataError, setRefDataError] = useState<string | null>(null);

  // 7. Create Ticket Form State
  const [categoryId, setCategoryId] = useState<string>("");
  const [relatedSystemId, setRelatedSystemId] = useState<string>("");
  const [requestedPriority, setRequestedPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [summary, setSummary] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [attachmentItems, setAttachmentItems] = useState<AttachmentItem[]>([]);

  // 8. Retained Created Ticket State for Attachment Retry (BR-18 Duplicate Ticket Protection)
  const [retainedCreatedTicket, setRetainedCreatedTicket] = useState<{ id: string; ticketNumber: string } | null>(null);

  // 9. Create Ticket Validation & Feedback State
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

  // Fetch reference data when switching to Create Ticket tab or My Tickets filters
  useEffect(() => {
    if ((activeTab === "create-ticket" || activeTab === "my-tickets") && formCategories.length === 0) {
      loadReferenceData();
    }
  }, [activeTab]);

  // Load My Tickets when parameters change or tab switches
  useEffect(() => {
    if (activeTab === "my-tickets" && !isSelecting && !selectedTicketId) {
      loadMyTickets();
    }
  }, [
    activeTab,
    isSelecting,
    selectedTicketId,
    searchQuery,
    filterCategoryId,
    filterRelatedSystemId,
    filterRequestedPriority,
    filterCurrentStatus,
    sortBy,
    sortOrder,
    currentPage,
    pageSize,
  ]);

  // Load Ticket Detail when selectedTicketId is set
  useEffect(() => {
    if (selectedTicketId) {
      loadTicketDetail(selectedTicketId);
    }
  }, [selectedTicketId]);

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

      if (storedId) {
        const found = requesters.find((r) => String(r.id) === String(storedId) && r.isActive !== false);
        if (found) {
          setCurrentRequester(found);
          setIsSelecting(false);
        } else {
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

  // Explicit requester-scoped ticket fetch with race protection
  async function loadMyTickets(overridePage?: number) {
    const pageToLoad = overridePage ?? currentPage;
    const requestId = ++latestTicketRequestIdRef.current;
    setTicketsLoading(true);
    setTicketsError(null);

    const capturedRequesterId = getSelectedRequesterId() || String(currentRequester?.id);

    try {
      const res = await fetchMyTickets(
        {
          search: searchQuery,
          categoryId: filterCategoryId,
          relatedSystemId: filterRelatedSystemId,
          requestedPriority: filterRequestedPriority,
          currentStatus: filterCurrentStatus,
          sortBy,
          sortOrder,
          page: pageToLoad,
          pageSize,
        },
        capturedRequesterId
      );

      if (requestId === latestTicketRequestIdRef.current) {
        setTickets(res?.data || []);
        setPagination(
          res?.pagination || { page: pageToLoad, pageSize, totalItems: res?.data?.length || 0, totalPages: 1 }
        );
      }
    } catch (err: any) {
      if (requestId === latestTicketRequestIdRef.current) {
        setTicketsError("Unable to load tickets. Please try again.");
        setTickets([]);
      }
    } finally {
      if (requestId === latestTicketRequestIdRef.current) {
        setTicketsLoading(false);
      }
    }
  }

  // Load Ticket Detail with ownership check and race protection
  async function loadTicketDetail(id: string) {
    const requestId = ++latestDetailRequestIdRef.current;
    setDetailLoading(true);
    setDetailError(null);
    setDetailTicket(null);

    const capturedRequesterId = getSelectedRequesterId() || String(currentRequester?.id);

    try {
      const res = await fetchTicketById(id, capturedRequesterId);
      if (requestId === latestDetailRequestIdRef.current) {
        setDetailTicket(res);
      }
    } catch (err: any) {
      if (requestId === latestDetailRequestIdRef.current) {
        if (err?.status === 404 || err?.data?.error?.code === "TICKET_NOT_FOUND") {
          setDetailError("Ticket not found.");
        } else {
          setDetailError("Unable to load ticket detail. Please try again.");
        }
      }
    } finally {
      if (requestId === latestDetailRequestIdRef.current) {
        setDetailLoading(false);
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
      resetRequesterState();
    }
  }

  function handleChangeRequester() {
    setIsSelecting(true);
    setSelectedId(currentRequester ? String(currentRequester.id) : null);
    resetRequesterState();
  }

  function resetRequesterState() {
    setSelectedTicketId(null);
    setDetailTicket(null);
    setDetailError(null);
    setSearchQuery("");
    setFilterCategoryId("");
    setFilterRelatedSystemId("");
    setFilterRequestedPriority("");
    setFilterCurrentStatus("");
    setSortBy("createdAt");
    setSortOrder("desc");
    setCurrentPage(1);
    resetFormFields();
    setCreatedTicketSuccess(null);
    setUploadWarning(null);
    setSubmitError(null);
  }

  // Clear filters on My Tickets
  function handleClearFilters() {
    setSearchQuery("");
    setFilterCategoryId("");
    setFilterRelatedSystemId("");
    setFilterRequestedPriority("");
    setFilterCurrentStatus("");
    setCurrentPage(1);
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

    if (refDataLoading || Boolean(refDataError) || formCategories.length === 0 || formRelatedSystems.length === 0) {
      return;
    }

    const capturedRequesterId = getSelectedRequesterId() || String(currentRequester?.id);

    submitLockRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);
    setUploadWarning(null);
    setCreatedTicketSuccess(null);

    try {
      let activeTicket = retainedCreatedTicket;

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

        if (!ticketNum || typeof ticketNum !== "string" || !ticketId) {
          throw new Error("Invalid ticket response from server: missing ticketNumber or id");
        }

        activeTicket = { id: String(ticketId), ticketNumber: String(ticketNum) };
      }

      if (attachmentItems.length > 0) {
        let hasUploadError = false;
        const itemsToUpload = attachmentItems.filter((item) => item.status !== "succeeded");

        for (const item of itemsToUpload) {
          try {
            setAttachmentItems((prev) =>
              prev.map((i) => (i.id === item.id ? { ...i, status: "uploading" } : i))
            );

            await uploadAttachment(activeTicket.id, item.file, capturedRequesterId);

            setAttachmentItems((prev) =>
              prev.map((i) => (i.id === item.id ? { ...i, status: "succeeded" } : i))
            );
          } catch (uploadErr) {
            hasUploadError = true;
            setAttachmentItems((prev) =>
              prev.map((i) => (i.id === item.id ? { ...i, status: "failed" } : i))
            );
          }
        }

        if (hasUploadError) {
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

  // Attachment Download Handler
  async function handleDownload(attachment: any) {
    if (attachment.isRemoved || attachment.removedAt) return;
    try {
      const res = await downloadAttachment(attachment.id);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", attachment.fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      // Handled visually
    }
  }

  // Soft Removal Modal Handlers
  function handleOpenRemovalModal(attachment: any) {
    setRemovalTargetAttachment(attachment);
    setRemovalReason("");
    setRemovalReasonError(null);
  }

  function handleCloseRemovalModal() {
    setRemovalTargetAttachment(null);
    setRemovalReason("");
    setRemovalReasonError(null);
  }

  async function handleConfirmRemoval(e: React.FormEvent) {
    e.preventDefault();
    if (!removalTargetAttachment || isSubmittingRemoval) return;

    const trimmed = removalReason.trim();
    if (trimmed.length < 5) {
      setRemovalReasonError("Removal reason must be at least 5 characters.");
      return;
    }
    if (trimmed.length > 200) {
      setRemovalReasonError("Removal reason cannot exceed 200 characters.");
      return;
    }

    setIsSubmittingRemoval(true);
    setRemovalReasonError(null);

    const capturedRequesterId = getSelectedRequesterId() || String(currentRequester?.id);

    try {
      const updatedAttachment = await softRemoveAttachment(
        removalTargetAttachment.id,
        trimmed,
        capturedRequesterId
      );

      // Update detail ticket attachments state
      setDetailTicket((prev: any) => {
        if (!prev) return prev;
        const updatedAttachments = (prev.attachments || []).map((att: any) => {
          if (att.id === removalTargetAttachment.id) {
            return {
              ...att,
              isRemoved: true,
              removedAt: updatedAttachment.removedAt || new Date().toISOString(),
              removalReason: trimmed,
            };
          }
          return att;
        });
        return { ...prev, attachments: updatedAttachments };
      });

      handleCloseRemovalModal();
    } catch (err: any) {
      setRemovalReasonError(err?.data?.error?.message || "Failed to remove attachment. Please try again.");
    } finally {
      setIsSubmittingRemoval(false);
    }
  }

  // Helper Priority Badge renderer
  function renderPriorityBadge(priority: string) {
    let bgClass = "bg-secondary";
    if (priority === "URGENT") bgClass = "bg-danger text-white";
    else if (priority === "HIGH") bgClass = "bg-warning text-dark";
    else if (priority === "MEDIUM") bgClass = "bg-success text-white";
    else if (priority === "LOW") bgClass = "bg-secondary text-white";

    return <span className={`badge ${bgClass}`}>{priority}</span>;
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

  const isFilterActive =
    searchQuery.trim() !== "" ||
    filterCategoryId !== "" ||
    filterRelatedSystemId !== "" ||
    filterRequestedPriority !== "" ||
    filterCurrentStatus !== "";

  // Render Application Shell with Selected Requester Context & Navigation Tabs
  return (
    <div className="container py-5" style={{ maxWidth: 900 }}>
      {/* App Shell Header displaying Current Requester Identity, Dev Mode Badge & Change Requester button */}
      <nav className="navbar navbar-light bg-light rounded p-3 mb-4 d-flex flex-wrap align-items-center justify-content-between gap-2 border">
        <div>
          <div className="d-flex align-items-center flex-wrap gap-2">
            <span className="text-muted">Current Requester:</span>
            <span className="fw-bold text-success fs-5">{currentRequester?.name}</span>
            <span className="badge bg-secondary">ID: {currentRequester?.id}</span>
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
            className={`nav-link ${activeTab === "my-tickets" && !selectedTicketId ? "active fw-bold text-success" : "text-secondary"}`}
            aria-current={activeTab === "my-tickets" && !selectedTicketId ? "page" : undefined}
            onClick={() => {
              setActiveTab("my-tickets");
              setSelectedTicketId(null);
            }}
          >
            My Tickets
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${activeTab === "create-ticket" ? "active fw-bold text-success" : "text-secondary"}`}
            aria-current={activeTab === "create-ticket" ? "page" : undefined}
            onClick={() => {
              setActiveTab("create-ticket");
              setSelectedTicketId(null);
            }}
          >
            Create Ticket
          </button>
        </li>
      </ul>

      {/* VIEW 1: Ticket Detail View Screen */}
      {selectedTicketId && (
        <section className="mb-5">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="h4 fw-bold mb-0">
              Ticket Detail {detailTicket ? `— ${detailTicket.ticketNumber}` : ""}
            </h2>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={() => setSelectedTicketId(null)}
              style={{ outlineColor: "#0B7A46" }}
            >
              Back to My Tickets
            </button>
          </div>

          {detailLoading && (
            <div className="alert alert-info" role="status">
              Loading ticket details…
            </div>
          )}

          {detailError && (
            <div className="alert alert-danger mb-4" role="alert">
              {detailError}
            </div>
          )}

          {!detailLoading && !detailError && detailTicket && (
            <div>
              {/* Shaded Read-Only Metadata Card */}
              <div className="card mb-4 bg-light shadow-sm">
                <div className="card-header bg-light fw-semibold">Ticket Information</div>
                <div className="card-body" style={{ backgroundColor: "#F0F4F2" }}>
                  <div className="row g-3">
                    <div className="col-12 col-md-4">
                      <label className="form-label small text-muted">Ticket Number</label>
                      <input type="text" className="form-control form-control-sm" value={detailTicket.ticketNumber || ""} readOnly style={{ backgroundColor: "#FFFFFF" }} />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label small text-muted">Requester</label>
                      <input type="text" className="form-control form-control-sm" value={detailTicket.requester?.name || currentRequester?.name || ""} readOnly style={{ backgroundColor: "#FFFFFF" }} />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label small text-muted">Requester Email</label>
                      <input type="text" className="form-control form-control-sm" value={detailTicket.requester?.email || currentRequester?.email || ""} readOnly style={{ backgroundColor: "#FFFFFF" }} />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label small text-muted">Category</label>
                      <input type="text" className="form-control form-control-sm" value={detailTicket.category?.name || detailTicket.categoryName || "N/A"} readOnly style={{ backgroundColor: "#FFFFFF" }} />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label small text-muted">Related System</label>
                      <input type="text" className="form-control form-control-sm" value={detailTicket.relatedSystem?.name || detailTicket.relatedSystemName || "N/A"} readOnly style={{ backgroundColor: "#FFFFFF" }} />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label small text-muted d-block">Priority / Status</label>
                      <div className="d-flex align-items-center gap-2 mt-1">
                        {renderPriorityBadge(detailTicket.requestedPriority)}
                        <span className="badge bg-primary">{detailTicket.currentStatus || "NEW"}</span>
                      </div>
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label small text-muted">Created Date</label>
                      <input type="text" className="form-control form-control-sm" value={formatDateTime(detailTicket.createdAt)} readOnly style={{ backgroundColor: "#FFFFFF" }} />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label small text-muted">Last Updated</label>
                      <input type="text" className="form-control form-control-sm" value={formatDateTime(detailTicket.updatedAt || detailTicket.createdAt)} readOnly style={{ backgroundColor: "#FFFFFF" }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Ticket Summary & Description */}
              <div className="card mb-4 shadow-sm">
                <div className="card-header bg-light fw-semibold">Summary & Description</div>
                <div className="card-body">
                  <div className="mb-3">
                    <label className="form-label fw-bold small text-muted">Summary</label>
                    <div className="p-2 border rounded bg-light">{detailTicket.summary}</div>
                  </div>
                  <div>
                    <label className="form-label fw-bold small text-muted">Description</label>
                    <div className="p-3 border rounded bg-light" style={{ whiteSpace: "pre-wrap" }}>
                      {detailTicket.description}
                    </div>
                  </div>
                </div>
              </div>

              {/* Attachments Section */}
              <div className="card mb-4 shadow-sm">
                <div className="card-header bg-light fw-semibold">Attachments</div>
                <div className="card-body">
                  {detailTicket.attachments && detailTicket.attachments.length > 0 ? (
                    <ul className="list-group">
                      {detailTicket.attachments.map((att: any) => {
                        const isRemoved = att.isRemoved || Boolean(att.removedAt);
                        return (
                          <li key={att.id} className="list-group-item d-flex flex-wrap align-items-center justify-content-between gap-2 p-3">
                            <div>
                              <div className="fw-bold d-flex align-items-center gap-2">
                                <span>{att.fileName}</span>
                                {isRemoved && <span className="badge bg-secondary">Removed</span>}
                              </div>
                              <div className="small text-muted">
                                Size: {(att.fileSize / 1024).toFixed(1)} KB | Uploaded: {formatDateTime(att.uploadedAt)}
                              </div>
                              {isRemoved && att.removalReason && (
                                <div className="small text-danger mt-1">
                                  Removal Reason: {att.removalReason} (Removed on {formatDateTime(att.removedAt)})
                                </div>
                              )}
                            </div>
                            <div className="d-flex align-items-center gap-2">
                              {!isRemoved ? (
                                <>
                                  <button
                                    type="button"
                                    className="btn btn-outline-primary btn-sm"
                                    onClick={() => handleDownload(att)}
                                    style={{ outlineColor: "#0B7A46" }}
                                  >
                                    Download
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-outline-danger btn-sm"
                                    onClick={() => handleOpenRemovalModal(att)}
                                    style={{ outlineColor: "#0B7A46" }}
                                  >
                                    Remove
                                  </button>
                                </>
                              ) : (
                                <button type="button" className="btn btn-outline-secondary btn-sm" disabled>
                                  Download Disabled
                                </button>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="text-muted italic">No attachments for this ticket.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Soft Removal Confirmation Modal */}
          {removalTargetAttachment && (
            <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title h6 fw-bold">Remove Attachment</h5>
                    <button type="button" className="btn-close" onClick={handleCloseRemovalModal} aria-label="Close"></button>
                  </div>
                  <form onSubmit={handleConfirmRemoval}>
                    <div className="modal-body">
                      <p className="small text-muted mb-3">
                        Are you sure you want to remove <strong>{removalTargetAttachment.fileName}</strong>?
                        Soft removal hides the file from downloads but retains metadata recording.
                      </p>
                      <div className="mb-3">
                        <label htmlFor="removalReason" className="form-label fw-semibold small">
                          Removal Reason <span className="text-danger">*</span> (5–200 characters)
                        </label>
                        <textarea
                          id="removalReason"
                          aria-label="Removal Reason"
                          rows={3}
                          className={`form-control ${removalReasonError ? "is-invalid" : ""}`}
                          value={removalReason}
                          onChange={(e) => setRemovalReason(e.target.value)}
                          placeholder="State the reason for removing this attachment..."
                          style={{ outlineColor: "#0B7A46" }}
                        />
                        {removalReasonError && (
                          <div className="invalid-feedback d-block mt-1" style={{ color: "#B42318" }}>
                            {removalReasonError}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleCloseRemovalModal}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-danger btn-sm" disabled={isSubmittingRemoval}>
                        {isSubmittingRemoval ? "Removing…" : "Confirm Removal"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* VIEW 2: My Tickets Screen View */}
      {activeTab === "my-tickets" && !selectedTicketId && (
        <section className="mb-5">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="h5 fw-bold mb-0">My Tickets</h2>
          </div>

          {/* Search, Filter & Sort Toolbar Card */}
          <div className="card mb-4 bg-light shadow-sm">
            <div className="card-body">
              <div className="row g-3">
                {/* Search Bar */}
                <div className="col-12 col-md-4">
                  <label htmlFor="searchTickets" className="form-label small fw-semibold">Search</label>
                  <input
                    type="text"
                    id="searchTickets"
                    aria-label="Search tickets"
                    className="form-control form-control-sm"
                    placeholder="Search tickets by number, summary..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    style={{ outlineColor: "#0B7A46" }}
                  />
                </div>

                {/* Category Filter */}
                <div className="col-6 col-md-2">
                  <label htmlFor="filterCategory" className="form-label small fw-semibold">Category</label>
                  <select
                    id="filterCategory"
                    aria-label="Filter by Category"
                    className="form-select form-select-sm"
                    value={filterCategoryId}
                    onChange={(e) => {
                      setFilterCategoryId(e.target.value);
                      setCurrentPage(1);
                    }}
                    style={{ outlineColor: "#0B7A46" }}
                  >
                    <option value="">All Categories</option>
                    {formCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* System Filter */}
                <div className="col-6 col-md-2">
                  <label htmlFor="filterSystem" className="form-label small fw-semibold">System</label>
                  <select
                    id="filterSystem"
                    aria-label="Filter by System"
                    className="form-select form-select-sm"
                    value={filterRelatedSystemId}
                    onChange={(e) => {
                      setFilterRelatedSystemId(e.target.value);
                      setCurrentPage(1);
                    }}
                    style={{ outlineColor: "#0B7A46" }}
                  >
                    <option value="">All Systems</option>
                    {formRelatedSystems.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority Filter */}
                <div className="col-6 col-md-2">
                  <label htmlFor="filterPriority" className="form-label small fw-semibold">Priority</label>
                  <select
                    id="filterPriority"
                    aria-label="Filter by Priority"
                    className="form-select form-select-sm"
                    value={filterRequestedPriority}
                    onChange={(e) => {
                      setFilterRequestedPriority(e.target.value);
                      setCurrentPage(1);
                    }}
                    style={{ outlineColor: "#0B7A46" }}
                  >
                    <option value="">All Priorities</option>
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div className="col-6 col-md-2">
                  <label htmlFor="filterStatus" className="form-label small fw-semibold">Status</label>
                  <select
                    id="filterStatus"
                    aria-label="Filter by Status"
                    className="form-select form-select-sm"
                    value={filterCurrentStatus}
                    onChange={(e) => {
                      setFilterCurrentStatus(e.target.value);
                      setCurrentPage(1);
                    }}
                    style={{ outlineColor: "#0B7A46" }}
                  >
                    <option value="">All Statuses</option>
                    <option value="NEW">NEW</option>
                  </select>
                </div>

                {/* Sort Control */}
                <div className="col-12 col-md-4">
                  <label htmlFor="sortBySelect" className="form-label small fw-semibold">Sort Tickets</label>
                  <select
                    id="sortBySelect"
                    aria-label="Sort by"
                    className="form-select form-select-sm"
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      setCurrentPage(1);
                    }}
                    style={{ outlineColor: "#0B7A46" }}
                  >
                    <option value="createdAt">Created Date (Newest First)</option>
                    <option value="updatedAt">Updated Date</option>
                    <option value="ticketNumber">Ticket Number</option>
                    <option value="requestedPriority">Priority Severity</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Loading Indicator */}
          {ticketsLoading && (
            <div className="alert alert-info" role="status">
              Loading tickets…
            </div>
          )}

          {/* Error Banner */}
          {ticketsError && (
            <div className="alert alert-danger d-flex align-items-center justify-content-between mb-4" role="alert">
              <span>{ticketsError}</span>
              <button
                type="button"
                className="btn btn-outline-danger btn-sm ms-2"
                onClick={() => loadMyTickets()}
                style={{ outlineColor: "#0B7A46" }}
              >
                Reload
              </button>
            </div>
          )}

          {/* Empty State (0 total tickets, no active filters) */}
          {!ticketsLoading && !ticketsError && tickets.length === 0 && !isFilterActive && (
            <div className="card text-center p-5 shadow-sm bg-light mb-4">
              <div className="card-body">
                <h3 className="h6 fw-bold text-muted mb-2">You have not created any IT support tickets yet</h3>
                <p className="small text-muted mb-3">Submit your first IT support ticket to get help with software, hardware, or access requests.</p>
                <button
                  type="button"
                  className="btn btn-success"
                  aria-label="Create new ticket"
                  onClick={() => {
                    setActiveTab("create-ticket");
                    setSelectedTicketId(null);
                  }}
                  style={{ backgroundColor: "#006B3C", borderColor: "#006B3C", outlineColor: "#0B7A46" }}
                >
                  Create Ticket
                </button>
              </div>
            </div>
          )}

          {/* No-Results Filter State (0 matching tickets, active filters) */}
          {!ticketsLoading && !ticketsError && tickets.length === 0 && isFilterActive && (
            <div className="card text-center p-4 shadow-sm bg-light mb-4">
              <div className="card-body">
                <h3 className="h6 fw-bold text-muted mb-2">No tickets match your filter criteria</h3>
                <p className="small text-muted mb-3">Try adjusting your search keyword or clearing category/system/priority filters.</p>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={handleClearFilters}
                  style={{ outlineColor: "#0B7A46" }}
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}

          {/* Ticket List View: Responsive Card items with complete columns */}
          {!ticketsLoading && !ticketsError && tickets.length > 0 && (
            <div>
              <div className="mb-4">
                {tickets.map((t) => (
                  <div key={t.id} className="card mb-3 shadow-sm border">
                    <div className="card-body p-3">
                      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
                        <div className="d-flex align-items-center gap-2">
                          <span className="fw-bold text-success">{t.ticketNumber}</span>
                          <span className="small text-muted">Created: {formatDate(t.createdAt)}</span>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          {renderPriorityBadge(t.requestedPriority)}
                          <span className="badge bg-primary">{t.currentStatus || "NEW"}</span>
                        </div>
                      </div>

                      <div className="fw-semibold fs-6 mb-2">{t.summary}</div>

                      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                        <div className="small text-muted">
                          Category: <strong className="text-dark me-3">{t.categoryName || t.category?.name || "N/A"}</strong>
                          System: <strong className="text-dark">{t.relatedSystemName || t.relatedSystem?.name || "N/A"}</strong>
                        </div>
                        <button
                          type="button"
                          className="btn btn-outline-success btn-sm"
                          onClick={() => setSelectedTicketId(t.id)}
                          style={{ borderColor: "#006B3C", color: "#006B3C", outlineColor: "#0B7A46" }}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 p-3 bg-light rounded border mb-4">
                <span className="small text-muted">
                  Page {pagination.page} of {pagination.totalPages || 1} ({pagination.totalItems} tickets total)
                </span>
                <div className="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    disabled={pagination.page <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    style={{ outlineColor: "#0B7A46" }}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    disabled={pagination.page >= (pagination.totalPages || 1)}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    style={{ outlineColor: "#0B7A46" }}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* VIEW 3: Create Ticket Screen View (Issue #28 Production Form Implementation) */}
      {activeTab === "create-ticket" && !selectedTicketId && (
        <section className="mb-5">
          <h2 className="h5 mb-3 fw-bold">Create IT Support Ticket</h2>

          {/* Reference Data Loading Indicator */}
          {refDataLoading && (
            <div className="alert alert-info mb-4" role="status">
              Loading ticket reference data…
            </div>
          )}

          {/* Reference Data Error Banner */}
          {refDataError && (
            <div className="alert alert-danger mb-4" role="alert">
              {refDataError}
            </div>
          )}

          {/* Success Banner with "Create Another Ticket" Action */}
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
