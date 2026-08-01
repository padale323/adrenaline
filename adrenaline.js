(function () {
    // --- Rate Limiting for XposedOrNot ---
    let breachTimestamps = [];
    const BREACH_WINDOW = 10000; // 10 seconds
    const BREACH_MAX = 3; // Max 3 requests

    // --- Helper Functions ---

    async function lookupDNS(args) {
        if (!args) return print("Usage: ad dns <domain> [A|MX|TXT|NS]");
        const [domain, type = "A"] = args.trim().split(" ");
        print(`Querying <span class='cmd'>${type}</span> records for <span class='cmd'>${domain}</span>...`, true);

        try {
            const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=${type.toUpperCase()}`, {
                headers: { "Accept": "application/dns-json" }
            });
            const data = await res.json();

            if (!data.Answer) {
                return print(`<span class='warning-text'>No ${type} records found for ${domain}.</span>`, true);
            }

            print("<hr>", true);
            data.Answer.forEach(record => {
                print(`* <span class='dim'>Type ${record.type}:</span> <b>${record.data}</b> (TTL: ${record.TTL}s)`, true);
            });
            print("<hr>", true);
        } catch (e) {
            print(`<span class='danger-text'>DNS lookup failed: ${e.message}</span>`, true);
        }
    }

    async function lookupWhois(domain) {
        if (!domain) return print("Usage: ad whois <domain>");
        print(`Fetching RDAP data for <span class='cmd'>${domain.trim()}</span>...`, true);

        try {
            const res = await fetch(`https://rdap.org/domain/${domain.trim()}`);
            if (!res.ok) throw new Error("Domain not found or unsupported TLD");

            const data = await res.json();
            const registrar = data.entities?.find(e => e.roles?.includes("registrar"))?.vcardArray?.[1]?.find(v => v[0] === "fn")?.[3] || "Unknown";

            print("<hr>", true);
            print(`<b>Domain:</b> ${data.ldhName}`);
            print(`<b>Registrar:</b> ${registrar}`);
            print(`<b>Handle:</b> ${data.handle || "N/A"}`);
            print(`<b>Status:</b> ${(data.status || []).join(", ")}`);
            print("<hr>", true);
        } catch (e) {
            print(`<span class='danger-text'>Error: ${e.message}</span>`, true);
        }
    }

    async function lookupGithub(user) {
        if (!user) return print("Usage: ad github <username>");
        print(`Fetching GitHub public profile for <span class='cmd'>${user.trim()}</span>...`, true);

        try {
            const res = await fetch(`https://api.github.com/users/${user.trim()}`);
            if (!res.ok) throw new Error("User not found");

            const data = await res.json();

            print("<hr>", true);
            print(`<b>Name:</b> ${data.name || "N/A"} (@${data.login})`);
            print(`<b>Bio:</b> ${data.bio || "No bio set"}`);
            print(`<b>Public Repos:</b> ${data.public_repos}`);
            print(`<b>Followers / Following:</b> ${data.followers} / ${data.following}`);
            print(`<b>Created At:</b> ${new Date(data.created_at).toLocaleDateString()}`);
            print(`<b>Profile URL:</b> <a href="${data.html_url}" target="_blank" style="color: #00ffff;">${data.html_url}</a>`, true);
            print("<hr>", true);
        } catch (e) {
            print(`<span class='danger-text'>Error: ${e.message}</span>`, true);
        }
    }

    async function lookupHeaders(url) {
        if (!url) return print("Usage: ad headers <https://example.com>");
        print(`Fetching headers for <span class='cmd'>${url.trim()}</span>...`, true);

        try {
            const res = await fetch(url.trim(), { method: "HEAD" });
            print("<hr>", true);
            print(`<b>Status Code:</b> ${res.status} ${res.statusText}`);

            for (const [key, value] of res.headers.entries()) {
                print(`* <span class='cmd'>${key}:</span> ${value}`, true);
            }
            print("<hr>", true);
        } catch (e) {
            print(`<span class='danger-text'>Could not fetch headers (CORS restriction or network error): ${e.message}</span>`, true);
        }
    }

    async function lookupBreach(args) {
        if (!args) return print("Usage: ad breached <email or phone>");

        const now = Date.now();
        breachTimestamps = breachTimestamps.filter(t => now - t < BREACH_WINDOW);

        if (breachTimestamps.length >= BREACH_MAX) {
            return print("Rate limit reached. Try again in a few seconds.");
        }

        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(args);
        const phone = args.replace(/\D/g,'');
        const isPhone = phone.length >= 7;

        if (!isEmail && !isPhone) {
            return print("Invalid email or phone format.");
        }

        breachTimestamps.push(now);
        print(`Checking breach records for <span class='cmd'>${args}</span>...`, true);

        try {
            let endpoint = isEmail 
                ? `https://api.xposedornot.com/v1/check-email/${encodeURIComponent(args)}`
                : `https://api.xposedornot.com/v1/check-phone/${encodeURIComponent(phone)}`;

            let r = await fetch(endpoint);

            if (r.status === 404) {
                return print("No breaches found.");
            }

            let j = await r.json();

            if (!j.breaches || j.breaches.length === 0) {
                print("No breaches found.");
            } else {
                print("<hr>", true);
                print(`<b>Breaches detected: ${j.breaches.length}</b>`, true);
                j.breaches.forEach(b => {
                    print(`* <span class='danger-text'>${b.breach}</span> <span class='dim'>(${b.exposed_data})</span>`, true);
                });
                print("<hr>", true);
            }

        } catch {
            print("<span class='danger-text'>Lookup failed. API unreachable or blocked by CORS.</span>", true);
        }
    }

    function launchDashboard() {
        if (!window.NoreAPI) {
            return print("<span class='danger-text'>NoreAPI is not available.</span>", true);
        }

        window.NoreAPI.launchApp(`
            <div style="padding: 30px; color: #00ffcc; font-family: monospace; max-width: 800px; margin: 0 auto;">
                <h1 style="border-bottom: 2px solid #00ffcc; padding-bottom: 10px;">⚡ ADRENALINE OSINT DASHBOARD</h1>
                <p style="color: #aaa;">Select a reconnaissance tool to execute directly from the dashboard:</p>

                <div style="margin-top: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div style="border: 1px solid #00ffcc33; padding: 15px; border-radius: 5px;">
                        <h3>🌐 DNS Lookup</h3>
                        <input id="adr-dns-input" type="text" placeholder="example.com" style="background:#111; color:#fff; border:1px solid #444; padding:8px; width:70%; margin-bottom: 10px;">
                        <br>
                        <button onclick="
                            const val = document.getElementById('adr-dns-input').value;
                            window.NoreAPI.exitApp();
                            window.handle('ad dns ' + val);
                        " style="padding:8px 15px; background:#00ffcc; color:#000; border:none; font-weight:bold; cursor:pointer;">Run DNS</button>
                    </div>

                    <div style="border: 1px solid #00ffcc33; padding: 15px; border-radius: 5px;">
                        <h3>📋 WHOIS / RDAP</h3>
                        <input id="adr-whois-input" type="text" placeholder="example.com" style="background:#111; color:#fff; border:1px solid #444; padding:8px; width:70%; margin-bottom: 10px;">
                        <br>
                        <button onclick="
                            const val = document.getElementById('adr-whois-input').value;
                            window.NoreAPI.exitApp();
                            window.handle('ad whois ' + val);
                        " style="padding:8px 15px; background:#00ffcc; color:#000; border:none; font-weight:bold; cursor:pointer;">Run WHOIS</button>
                    </div>

                    <div style="border: 1px solid #00ffcc33; padding: 15px; border-radius: 5px;">
                        <h3>🐙 GitHub Profile</h3>
                        <input id="adr-gh-input" type="text" placeholder="username" style="background:#111; color:#fff; border:1px solid #444; padding:8px; width:70%; margin-bottom: 10px;">
                        <br>
                        <button onclick="
                            const val = document.getElementById('adr-gh-input').value;
                            window.NoreAPI.exitApp();
                            window.handle('ad github ' + val);
                        " style="padding:8px 15px; background:#00ffcc; color:#000; border:none; font-weight:bold; cursor:pointer;">Run GitHub</button>
                    </div>

                    <div style="border: 1px solid #ff444433; padding: 15px; border-radius: 5px;">
                        <h3 style="color: #ff4444;">🚨 XposedOrNot Breach Check</h3>
                        <input id="adr-breach-input" type="text" placeholder="email or phone" style="background:#111; color:#fff; border:1px solid #444; padding:8px; width:70%; margin-bottom: 10px;">
                        <br>
                        <button onclick="
                            const val = document.getElementById('adr-breach-input').value;
                            window.NoreAPI.exitApp();
                            window.handle('ad breached ' + val);
                        " style="padding:8px 15px; background:#ff4444; color:#000; border:none; font-weight:bold; cursor:pointer;">Run Breach Check</button>
                    </div>
                </div>

                <div style="margin-top: 30px; text-align: center;">
                    <button onclick="window.NoreAPI.exitApp()" style="padding: 10px 20px; background: transparent; color: #aaa; border: 1px solid #aaa; cursor: pointer; font-weight: bold;">
                        Close Dashboard
                    </button>
                </div>
            </div>
        `);
    }

    // --- Core Handler ---
    const adrenalineHandler = async function (args) {
        if (!args) {
            print("<b>⚡ Adrenaline OSINT Suite</b>", true);
            print("Usage: ad <subcommand> [target]");
            print("* <span class='cmd'>ad ui</span> - Launch full-screen GUI", true);
            print("* <span class='cmd'>ad dns &lt;domain&gt; [type]</span> - DNS lookup", true);
            print("* <span class='cmd'>ad whois &lt;domain&gt;</span> - Domain RDAP lookup", true);
            print("* <span class='cmd'>ad github &lt;username&gt;</span> - GitHub profile info", true);
            print("* <span class='cmd'>ad headers &lt;url&gt;</span> - Fetch HTTP headers", true);
            print("* <span class='cmd'>ad breached &lt;email/phone&gt;</span> - XposedOrNot breach check", true);
            return;
        }

        const parts = args.trim().split(" ");
        const subCmd = parts[0].toLowerCase();
        const target = parts.slice(1).join(" ");

        switch (subCmd) {
            case "dns":
                return await lookupDNS(target);
            case "whois":
                return await lookupWhois(target);
            case "github":
            case "gh":
                return await lookupGithub(target);
            case "headers":
                return await lookupHeaders(target);
            case "breached":
                return await lookupBreach(target);
            case "ui":
            case "app":
            case "gui":
                return launchDashboard();
            default:
                print(`<span class='danger-text'>Unknown subcommand: ${subCmd}</span>`, true);
                print("Available subcommands: dns, whois, github, headers, breached, ui");
        }
    };

    // --- Command Registration ---
    window.registerCommand(
        "adrenaline",
        "OSINT Reconnaissance Suite. Subcommands: dns, whois, github, headers, breached, ui",
        adrenalineHandler
    );

    // Register alias
    window.registerCommand(
        "ad",
        "Alias for adrenaline OSINT suite.",
        adrenalineHandler
    );

    console.log("[adrenaline] OSINT Plugin loaded.");
})();
