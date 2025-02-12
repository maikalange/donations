
document.addEventListener("DOMContentLoaded", async () => {
    await checkAuth();

    const mapContainer = document.getElementById("map");
    const map = L.map(mapContainer).setView([-15.35205491978142,28.37704181671143], 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

    let cooldownActive = false;


    // Define custom icons for different incident types
    const icons = {
        theft: L.icon({ iconUrl: "../images/theft.png", iconSize: [32, 32] }),
        assault: L.icon({ iconUrl: "../images/assault.png", iconSize: [32, 32] }),
        vandalism: L.icon({ iconUrl: "../images/vandalism.png", iconSize: [36, 36] }),
        blackout: L.icon({ iconUrl: "../images/blackout.png", iconSize: [32, 48] }),
        partial: L.icon({ iconUrl: "../images/partial.png", iconSize: [36, 36] }),
    };

    function getIcon(type) {
        return icons[type] || icons["theft"]; // Default icon
    }

    async function checkAuth() {
        try {
            const response = await fetch("/api/auth/check", { credentials: "include" });
            if (response.status !== 200) {
                console.warn("User not authenticated. Redirecting to login.");
                window.location.href = "/login.html";
            }
        } catch (error) {
            console.error("Authentication check failed:", error);
            window.location.href = "/login.html";
        }
    }

    async function loadIncidents() {
        const response = await fetch("/api/incidents", { credentials: "include" });
        console.log(response);
        if (response.status === 401) {
            alert("Session expired. Please log in again.");
            window.location.href = "/login.html";
            return;
        }

        const incidents = await response.json();
        incidents.forEach((incident) => {
            const timeReported= new Date(incident.createdAt).toLocaleString("en-ZM");
            const [lng, lat] = incident.location.coordinates;
            const markerIcon = getIcon(incident.type);

            L.marker([lat, lng], { icon: markerIcon })
                .addTo(map)
                .bindPopup(
                    `<b>${incident.category.toUpperCase()}</b><br>
                     Type: ${incident.type}<br>
                     Meter Number: ${incident.meterNumber || "N/A"}<br>
                     Reference: ${incident.reference || "N/A"}<br>      
                     Reported at: ${timeReported}<br>               
                     `
                );
        });
    }
    

    function startCooldown() {
        cooldownActive = true;
        let cooldownTime = 30; // Cooldown for 30 seconds

        const cooldownInterval = setInterval(() => {
            if (cooldownTime <= 0) {
                cooldownActive = false;
                clearInterval(cooldownInterval);
                document.getElementById("submitButton").innerText = "Submit";
                document.getElementById("submitButton").disabled = false;
            } else {
                document.getElementById("submitButton").innerText = `Wait (${cooldownTime}s)`;
                document.getElementById("submitButton").disabled = true;
            }
            cooldownTime--;
        }, 1000);
    }

    map.on("click", (e) => {
        if (cooldownActive) {
            alert("Please wait before submitting another report.");
            return;
        }

        const { lat, lng } = e.latlng;
        const popupContent = `
            <form id="popupForm">
                <h3>Report an Incident</h3>
                
                <label>
                    Category:
                    <select id="category" required>
                        <option value="crime">Crime</option>
                        <option value="outage">Power Outage</option>
                    </select>
                </label>

                <label>
                    Type:
                    <select id="type" required>
                        <option value="theft">Theft</option>
                        <option value="assault">Assault</option>
                        <option value="vandalism">Vandalism</option>
                    </select>
                </label>

                <label>
                    Meter Number (required for Outages):
                    <input type="text" id="meterNumber" placeholder="e.g. 123456789" />
                </label>

                <label>
                    Reference Number (optional):
                    <input type="text" id="reference" placeholder="e.g. OUT-12345" />
                </label>

                <input type="text" id="honeypot" name="honeypot" style="display:none;" autocomplete="off">

                <button type="submit" id="submitButton">Submit</button>
            </form>
        `;

        const popup = L.popup().setLatLng([lat, lng]).setContent(popupContent).openOn(map);

        const popupForm = document.getElementById("popupForm");
        const categorySelect = popupForm.querySelector("#category");
        const typeSelect = popupForm.querySelector("#type");
        const meterNumberInput = popupForm.querySelector("#meterNumber");

        function updateTypeOptions() {
            typeSelect.innerHTML = ""; // Clear existing options

            if (categorySelect.value === "crime") {
                typeSelect.innerHTML = `
                    <option value="theft">Theft</option>
                    <option value="assault">Assault</option>
                    <option value="vandalism">Vandalism</option>
                `;
                meterNumberInput.removeAttribute("required");
            } else {
                typeSelect.innerHTML = `
                    <option value="blackout">Full Blackout</option>
                    <option value="partial">Partial Outage</option>
                `;
                meterNumberInput.setAttribute("required", "true");
            }
        }

        categorySelect.addEventListener("change", updateTypeOptions);
        updateTypeOptions();

        popupForm.addEventListener("submit", async (evt) => {
            evt.preventDefault();

            const category = categorySelect.value;
            const type = typeSelect.value;
            const meterNumber = meterNumberInput.value.trim();
            const reference = popupForm.querySelector("#reference").value.trim();
            const honeypot = popupForm.querySelector("#honeypot").value; // Hidden field
            const timeReported= new Date().toLocaleString("en-ZM");
            if (honeypot) {
                console.log("Spam bot detected, form ignored.");
                return;
            }

            if (category === "outage" && !meterNumber) {
                alert("Please enter a Meter Number for Power Outages.");
                return;
            }

            const newIncident = {
                category,
                type,
                meterNumber: meterNumber || null,
                reference: reference || null,
                location: { type: "Point", coordinates: [lng, lat] },
            };

            const res = await fetch("/api/incidents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(newIncident),
            });

            if (res.ok) {
                alert("Incident reported successfully!");
                map.closePopup();
                startCooldown(); // Activate cooldown

                const markerIcon = getIcon(type);
                L.marker([lat, lng], { icon: markerIcon })
                    .addTo(map)
                    .bindPopup(
                        `<b>${category.toUpperCase()}</b><br>
                         Type: ${type}<br>
                         Meter Number: ${meterNumber || "N/A"}<br>
                         Reference: ${reference || "N/A"}<br>
                         Reference: ${timeReported}<br>
                         `
                    );
            } else {
                alert("Failed to report incident.");
            }
        });
    });

    loadIncidents();
});

async function logoutUser() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    alert("Logged out successfully!");
    window.location.href = "/login.html";
}
