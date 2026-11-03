
const loading = document.getElementById("loading");
const errorSection = document.getElementById("errorSection");
const errorMessage = document.getElementById("errorMessage");

const equipmentSection =
    document.getElementById("equipmentSection");

const documentList =
    document.getElementById("documentList");


// =====================================
// SHOW ERROR
// =====================================

function showError(message) {

    loading.hidden = true;
    equipmentSection.hidden = true;
    errorSection.hidden = false;

    errorMessage.textContent = message;
}


// =====================================
// LOAD EQUIPMENT
// =====================================

async function loadEquipmentPage() {

    try {

        // Get equipment ID from QR URL
        const params = new URLSearchParams(
            window.location.search
        );

        const equipmentId = params.get("id");

        if (!equipmentId) {
            throw new Error("Equipment ID is missing.");
        }


        // Get equipment information
        const { data: equipment, error: equipmentError } =
            await supabaseClient
                .from("equipment")
                .select("id, name")
                .eq("id", equipmentId)
                .maybeSingle();

        if (equipmentError) throw equipmentError;

        if (!equipment) {
            throw new Error("Equipment not found.");
        }


        // Display equipment name
        document.getElementById("equipmentName")
            .textContent = equipment.name;

        document.title = equipment.name + " - Manuals";


        // Get PDF records
        const { data: documents, error: documentError } =
            await supabaseClient
                .from("equipment_documents")
                .select("id, title, file_name, file_path")
                .eq("equipment_id", equipmentId)
                .order("created_at", { ascending: false });

        if (documentError) throw documentError;


        // Display PDF manuals
        displayDocuments(documents || []);

        loading.hidden = true;
        errorSection.hidden = true;
        equipmentSection.hidden = false;

    } catch (error) {

        console.error(error);

        showError(error.message);
    }
}


// =====================================
// DISPLAY PDF DOCUMENTS
// =====================================

function displayDocuments(documents) {

    documentList.replaceChildren();

    if (!documents.length) {

        const message = document.createElement("p");

        message.textContent =
            "No PDF manuals are available for this equipment.";

        documentList.appendChild(message);

        return;
    }


    documents.forEach(doc => {

        const { data } = supabaseClient
            .storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(doc.file_path);


        // PDF card
        const card = document.createElement("div");
        card.className = "document-card";


        const icon = document.createElement("div");
        icon.className = "pdf-icon";
        icon.textContent = "PDF";


        const details = document.createElement("div");
        details.className = "document-details";


        const title = document.createElement("h3");
        title.textContent = doc.title;


        const filename = document.createElement("p");
        filename.textContent = doc.file_name;

        details.append(title, filename);


        // Buttons
        const actions = document.createElement("div");
        actions.className = "document-actions";


        const viewButton = document.createElement("a");

        viewButton.href = data.publicUrl;
        viewButton.target = "_blank";
        viewButton.rel = "noopener noreferrer";
        viewButton.textContent = "View PDF";
        viewButton.className = "view-btn";


        const downloadButton = document.createElement("a");

        downloadButton.href = data.publicUrl + "?download";
        downloadButton.textContent = "Download PDF";
        downloadButton.className = "download-btn";


        actions.append(viewButton, downloadButton);

        card.append(icon, details, actions);

        documentList.appendChild(card);
    });
}


// =====================================
// START
// =====================================

loadEquipmentPage();
