import { useState, useEffect } from "react";
import {
  checkSystem,
  Category,
  Requester,
  fetchActiveRequesters,
  getSelectedRequesterId,
  setSelectedRequesterId,
  fetchMyTickets,
} from "./api.js";

type UiState = "idle" | "loading" | "success" | "error";

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

  // 3. Requester ticket data state (Top level of App component)
  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState<boolean>(false);

  // 4. Startup Effect (Top level of App component)
  useEffect(() => {
    loadRequestersAndRestoreContext();
  }, []);

  // Normal helper functions (No React Hooks declared inside helper functions)
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

  async function loadTicketsForRequester(requesterId: string) {
    setTicketsLoading(true);
    try {
      const res = await fetchMyTickets();
      setTickets(res?.data || []);
    } catch (err) {
      setTickets([]);
    } finally {
      setTicketsLoading(false);
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
      loadTicketsForRequester(String(chosen.id));
    }
  }

  function handleChangeRequester() {
    setIsSelecting(true);
    setSelectedId(currentRequester ? String(currentRequester.id) : null);
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

  // Render Application Shell with Selected Requester Context
  return (
    <div className="container py-5" style={{ maxWidth: 800 }}>
      {/* App Shell Header displaying Current Requester Identity & Change Requester button */}
      <nav className="navbar navbar-light bg-light rounded p-3 mb-4 d-flex align-items-center justify-content-between border">
        <div>
          <span className="text-muted me-2">Current Requester:</span>
          <span className="fw-bold text-success fs-5">{currentRequester?.name}</span>
          <span className="badge bg-secondary ms-2">ID: {currentRequester?.id}</span>
        </div>
        <button className="btn btn-outline-secondary btn-sm" onClick={handleChangeRequester}>
          Change Requester
        </button>
      </nav>

      {/* Main Application Shell Content */}
      <header className="mb-4">
        <h1 className="h3">
          TokTickIT <span className="text-success">IT Service Desk</span>
        </h1>
      </header>

      {/* Requester-specific ticket data view */}
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
