// Agappe customer documentation portal
const loading = document.getElementById("loading");
const homeSection = document.getElementById("homeSection");
const errorSection = document.getElementById("errorSection");
const errorMessage = document.getElementById("errorMessage");
const errorTitle = document.getElementById("errorTitle");
const equipmentSection = document.getElementById("equipmentSection");
const documentList = document.getElementById("documentList");

document.getElementById("year").textContent = new Date().getFullYear();

function showState(state) {
  loading.hidden = state !== "loading";
  homeSection.hidden = state !== "home";
  errorSection.hidden = state !== "error";
  equipmentSection.hidden = state !== "equipment";
}

function showError(message, title = "Equipment not found") {
  errorTitle.textContent = title;
  errorMessage.textContent = message;
  showState("error");
}

async function loadEquipmentPage() {
  const equipmentId = new URLSearchParams(window.location.search).get("id");

  // Opening the base GitHub Pages URL is a valid home page, not an error.
  if (!equipmentId) {
    showState("home");
    return;
  }

  try {
    if (!window.supabase || !window.supabase.createClient) {
      throw new Error("The documentation service could not be initialized. Please try again later.");
    }

    const { data: equipment, error: equipmentError } = await supabaseClient
      .from("equipment")
      .select("id, name")
      .eq("id", equipmentId)
      .maybeSingle();

    if (equipmentError) throw equipmentError;
    if (!equipment) {
      showError("This QR code may be outdated, or the equipment record is not available.");
      return;
    }

    document.getElementById("equipmentName").textContent = equipment.name;
    document.title = `${equipment.name} | Agappe Manuals`;

    const { data: documents, error: documentError } = await supabaseClient
      .from("equipment_documents")
      .select("id, title, file_name, file_path, created_at")
      .eq("equipment_id", equipmentId)
      .order("created_at", { ascending: false });

    if (documentError) throw documentError;

    renderDocuments(documents || []);
    showState("equipment");
  } catch (error) {
    console.error("Documentation portal error:", error);
    showError(error.message || "Unable to load the manuals. Please try again.", "Unable to load documentation");
  }
}

function renderDocuments(documents) {
  documentList.replaceChildren();
  document.getElementById("documentCount").textContent =
    `${documents.length} ${documents.length === 1 ? "DOCUMENT" : "DOCUMENTS"}`;

  if (!documents.length) {
    const empty = document.createElement("div");
    empty.className = "empty-documents";
    empty.textContent = "No PDF manuals are currently available for this equipment.";
    documentList.appendChild(empty);
    return;
  }

  documents.forEach((doc) => {
    const { data, error } = supabaseClient.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(doc.file_path);

    if (error || !data?.publicUrl) return;
    const pdfUrl = data.publicUrl;

    const card = document.createElement("article");
    card.className = "document-card";

    const icon = document.createElement("div");
    icon.className = "pdf-icon";
    icon.textContent = "PDF";

    const details = document.createElement("div");
    details.className = "document-details";

    const title = document.createElement("h4");
    title.textContent = doc.title || doc.file_name || "User manual";

    const filename = document.createElement("p");
    filename.textContent = doc.file_name || "PDF document";
    details.append(title, filename);

    const actions = document.createElement("div");
    actions.className = "document-actions";

    const view = document.createElement("a");
    view.className = "view-btn";
    view.href = pdfUrl;
    view.target = "_blank";
    view.rel = "noopener noreferrer";
    view.textContent = "View manual";

    const download = document.createElement("a");
    download.className = "download-btn";
    download.href = `${pdfUrl}${pdfUrl.includes("?") ? "&" : "?"}download`;
    download.setAttribute("download", doc.file_name || "manual.pdf");
    download.textContent = "Download";

    actions.append(view, download);
    card.append(icon, details, actions);
    documentList.appendChild(card);
  });

  if (!documentList.children.length) {
    const empty = document.createElement("div");
    empty.className = "empty-documents";
    empty.textContent = "The manuals could not be loaded. Please contact support.";
    documentList.appendChild(empty);
  }
}

loadEquipmentPage();