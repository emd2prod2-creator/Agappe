// ============================================
// SUPABASE ADMIN DASHBOARD
// Individual PDF QR Code Generator
// ============================================


// --------------------------------------------
// 1. GET HTML ELEMENTS
// --------------------------------------------

const loginSection = document.getElementById("loginSection");
const dashboardSection = document.getElementById("dashboardSection");

const loginForm = document.getElementById("loginForm");
const equipmentForm = document.getElementById("equipmentForm");

const logoutBtn = document.getElementById("logoutBtn");
const uploadBtn = document.getElementById("uploadBtn");

const equipmentNameInput = document.getElementById("equipmentName");
const pdfFilesInput = document.getElementById("pdfFiles");

const loginMessage = document.getElementById("loginMessage");
const statusMessage = document.getElementById("statusMessage");

const qrResult = document.getElementById("qrResult");
const equipmentList = document.getElementById("equipmentList");


// --------------------------------------------
// 2. LOGIN AND SESSION
// --------------------------------------------

function showDashboard(isLoggedIn) {

    loginSection.hidden = isLoggedIn;
    dashboardSection.hidden = !isLoggedIn;

    if (!isLoggedIn) {
        qrResult.innerHTML = "";
        equipmentList.innerHTML = "";
    }
}


async function initializeDashboard() {

    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
        console.error("Session error:", error);
        loginMessage.textContent = error.message;
        return;
    }

    showDashboard(Boolean(data.session));

    if (data.session) {
        await loadEquipment();
    }
}


loginForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    loginMessage.textContent = "Logging in...";

    const email = document.getElementById("email").value.trim();

    const password = document.getElementById("password").value;

    const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {

        loginMessage.textContent = error.message;

        return;
    }

    loginForm.reset();

    loginMessage.textContent = "";

    showDashboard(true);

    await loadEquipment();

});


logoutBtn.addEventListener("click", async () => {

    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        alert(error.message);
        return;
    }

    showDashboard(false);

});


// --------------------------------------------
// 3. STATUS MESSAGE
// --------------------------------------------

function showStatus(message, type = "info") {

    statusMessage.textContent = message;

    statusMessage.className = `status-message ${type}`;

}


// --------------------------------------------
// 4. VALIDATE PDF FILES
// --------------------------------------------

function validatePdfFiles(files) {

    if (!files || files.length === 0) {

        throw new Error("Please select at least one PDF file.");

    }

    for (const file of files) {

        const isPdf =
            file.type === "application/pdf" ||
            file.name.toLowerCase().endsWith(".pdf");

        if (!isPdf) {

            throw new Error(`${file.name} is not a PDF file.`);

        }

        if (file.size > 50 * 1024 * 1024) {

            throw new Error(`${file.name} exceeds the 50 MB limit.`);

        }

    }

}


// --------------------------------------------
// 5. CREATE SAFE FILE NAME
// --------------------------------------------

function createSafeFileName(fileName) {

    return fileName
        .normalize("NFKD")
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .replace(/_+/g, "_");

}


// --------------------------------------------
// 6. UPLOAD PDF FILES
// --------------------------------------------

async function uploadPdfFiles(equipmentId, files) {

    validatePdfFiles(files);

    const uploadedDocuments = [];

    for (const file of files) {

        const safeName = createSafeFileName(file.name);

        const filePath =
            `${equipmentId}/${crypto.randomUUID()}-${safeName}`;


        // Upload PDF to Supabase Storage

        const { error: uploadError } = await supabaseClient
            .storage
            .from(STORAGE_BUCKET)
            .upload(filePath, file, {
                contentType: "application/pdf",
                upsert: false
            });


        if (uploadError) {

            throw new Error(
                `PDF upload failed: ${uploadError.message}`
            );

        }


        // Save PDF information in database

        const { data: pdfDocument, error: insertError } =
            await supabaseClient
                .from("equipment_documents")
                .insert({

                    equipment_id: equipmentId,

                    title: file.name.replace(/\.pdf$/i, ""),

                    file_name: file.name,

                    file_path: filePath

                })
                .select()
                .single();


        if (insertError) {

            await supabaseClient
                .storage
                .from(STORAGE_BUCKET)
                .remove([filePath]);

            throw new Error(
                `Database error for ${file.name}: ${insertError.message}`
            );

        }


        uploadedDocuments.push(pdfDocument);

    }

    return uploadedDocuments;

}


// --------------------------------------------
// 7. GET DIRECT PDF URL
// --------------------------------------------

function getDirectPdfUrl(filePath) {

    const { data, error } = supabaseClient
        .storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);

    if (error || !data || !data.publicUrl) {

        throw new Error("Unable to generate PDF URL.");

    }

    return data.publicUrl;

}


// --------------------------------------------
// 8. GENERATE INDIVIDUAL PDF QR CARD
// --------------------------------------------

function createQrCard(pdfDocument) {

    const pdfUrl = getDirectPdfUrl(pdfDocument.file_path);


    const card = document.createElement("div");

    card.className = "qr-card";


    // PDF title

    const title = document.createElement("h3");

    title.textContent =
        pdfDocument.title || pdfDocument.file_name;


    // PDF filename

    const fileName = document.createElement("p");

    fileName.className = "qr-file-name";

    fileName.textContent = pdfDocument.file_name;


    // QR container

    const qrContainer = document.createElement("div");

    qrContainer.className = "qr-image";


    // Direct PDF link

    const directLink = document.createElement("a");

    directLink.href = pdfUrl;

    directLink.target = "_blank";

    directLink.rel = "noopener noreferrer";

    directLink.textContent = "Open PDF directly";


    // Download QR button

    const downloadButton = document.createElement("button");

    downloadButton.type = "button";

    downloadButton.textContent = "Download QR PNG";


    // Add elements

    card.appendChild(title);

    card.appendChild(fileName);

    card.appendChild(qrContainer);

    card.appendChild(directLink);

    card.appendChild(downloadButton);


    // Generate QR containing DIRECT PDF URL

    new QRCode(qrContainer, {

        text: pdfUrl,

        width: 240,

        height: 240,

        colorDark: "#000000",

        colorLight: "#ffffff",

        correctLevel: QRCode.CorrectLevel.M

    });


    // Download QR

    downloadButton.addEventListener("click", () => {

        downloadQrImage(qrContainer, pdfDocument.file_name);

    });


    return card;

}


// --------------------------------------------
// 9. DOWNLOAD QR PNG
// --------------------------------------------

function downloadQrImage(container, fileName) {

    const canvas = container.querySelector("canvas");

    const image = container.querySelector("img");

    let imageUrl;


    if (canvas) {

        imageUrl = canvas.toDataURL("image/png");

    } else if (image && image.src) {

        imageUrl = image.src;

    } else {

        alert("QR code is not ready.");

        return;

    }


    const link = document.createElement("a");

    const safeName = createSafeFileName(
        fileName.replace(/\.pdf$/i, "")
    );

    link.href = imageUrl;

    link.download = `${safeName}-QR.png`;

    document.body.appendChild(link);

    link.click();

    link.remove();

}


// --------------------------------------------
// 10. ADD NEW EQUIPMENT
// --------------------------------------------

equipmentForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const name = equipmentNameInput.value.trim();

    const files = Array.from(pdfFilesInput.files || []);


    if (!name) {

        showStatus("Enter equipment name.", "error");

        return;

    }


    try {

        validatePdfFiles(files);

    } catch (error) {

        showStatus(error.message, "error");

        return;

    }


    uploadBtn.disabled = true;

    uploadBtn.textContent = "Uploading PDFs...";

    qrResult.innerHTML = "";


    try {

        // Create equipment record

        const { data: equipment, error: equipmentError } =
            await supabaseClient
                .from("equipment")
                .insert({
                    name: name
                })
                .select()
                .single();


        if (equipmentError) {

            throw new Error(equipmentError.message);

        }


        // Upload selected PDFs

        const documents = await uploadPdfFiles(
            equipment.id,
            files
        );


        // Generate separate QR for each PDF

        documents.forEach((pdfDocument) => {

            qrResult.appendChild(
                createQrCard(pdfDocument)
            );

        });


        equipmentForm.reset();


        showStatus(
            `${documents.length} PDF(s) uploaded successfully. Individual QR codes generated.`,
            "success"
        );


        await loadEquipment();


    } catch (error) {

        console.error("Upload error:", error);

        showStatus(error.message, "error");


    } finally {

        uploadBtn.disabled = false;

        uploadBtn.textContent =
            "Upload PDFs & Generate QR Codes";

    }

});


// --------------------------------------------
// 11. LOAD REGISTERED EQUIPMENT
// --------------------------------------------

async function loadEquipment() {

    equipmentList.textContent = "Loading equipment...";


    const { data: equipmentRecords, error } = await supabaseClient
        .from("equipment")
        .select("id, name, created_at")
        .order("created_at", { ascending: false });


    if (error) {

        console.error(error);

        equipmentList.textContent = error.message;

        return;

    }


    equipmentList.innerHTML = "";


    if (!equipmentRecords || equipmentRecords.length === 0) {

        equipmentList.textContent = "No equipment registered yet.";

        return;

    }


    for (const equipment of equipmentRecords) {

        const card = document.createElement("div");

        card.className = "equipment-card";


        const heading = document.createElement("h3");

        heading.textContent = equipment.name;


        const addButton = document.createElement("button");

        addButton.type = "button";

        addButton.textContent = "Add More PDFs";


        const documentsArea = document.createElement("div");

        documentsArea.className = "equipment-documents";


        card.appendChild(heading);

        card.appendChild(addButton);

        card.appendChild(documentsArea);

        equipmentList.appendChild(card);


        // Get PDF records for this equipment

        const { data: documents, error: documentError } =
            await supabaseClient
                .from("equipment_documents")
                .select("id, title, file_name, file_path")
                .eq("equipment_id", equipment.id)
                .order("created_at", { ascending: true });


        if (documentError) {

            documentsArea.textContent = documentError.message;

            continue;

        }


        if (!documents || documents.length === 0) {

            documentsArea.textContent = "No PDF manuals uploaded.";

        } else {

            documents.forEach((pdfDocument) => {

                const row = document.createElement("div");

                row.className = "document-row";


                const name = document.createElement("span");

                name.textContent = pdfDocument.file_name;


                const qrButton = document.createElement("button");

                qrButton.type = "button";

                qrButton.textContent = "Generate QR";


                qrButton.addEventListener("click", () => {

                    qrResult.innerHTML = "";

                    qrResult.appendChild(
                        createQrCard(pdfDocument)
                    );

                    qrResult.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });

                });


                row.appendChild(name);

                row.appendChild(qrButton);

                documentsArea.appendChild(row);

            });

        }


        // Add additional PDFs

        addButton.addEventListener("click", () => {

            addMorePdfs(equipment.id);

        });

    }

}


// --------------------------------------------
// 12. ADD MORE PDFS TO EXISTING EQUIPMENT
// --------------------------------------------

async function addMorePdfs(equipmentId) {

    const fileInput = document.createElement("input");

    fileInput.type = "file";

    fileInput.accept = ".pdf,application/pdf";

    fileInput.multiple = true;


    // Listen before opening the file picker

    fileInput.addEventListener("change", async () => {

        const files = Array.from(fileInput.files || []);


        if (files.length === 0) {

            return;

        }


        try {

            validatePdfFiles(files);

            showStatus("Uploading additional PDFs...", "info");


            // Upload selected PDFs

            const documents = await uploadPdfFiles(
                equipmentId,
                files
            );


            // Generate QR for every new PDF

            qrResult.innerHTML = "";

            documents.forEach((pdfDocument) => {

                qrResult.appendChild(
                    createQrCard(pdfDocument)
                );

            });


            showStatus(
                `${documents.length} additional PDF(s) uploaded successfully. QR codes generated.`,
                "success"
            );


            // Refresh equipment list

            await loadEquipment();


        } catch (error) {

            console.error("Additional upload error:", error);

            showStatus(error.message, "error");

        }

    });


    // Open file selection window

    fileInput.click();

}


// --------------------------------------------
// 13. START APPLICATION
// --------------------------------------------

initializeDashboard();