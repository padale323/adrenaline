(function () {
    // --- Helper Functions ---

    async function lookupDNS(args) {
        if (!args) return print("Usage: adrenaline dns <domain> [A|MX|TXT|NS]");
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
        if (!domain) return print("Usage: adrenaline whois <domain>");
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
        if (!user) return print("Usage: adrenaline github <username>");
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
        if (!url) return print("Usage: adrenaline headers <https://example.com>");
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

    function launchDashboard() {
        if (!window.NoreAPI) {
            return print("<span class='danger-text'>NoreAPI is not available.</span>", true);
        }

        window.NoreAPI.launchApp(`
            <div style="padding: 30px; color: #00ffcc; font-family: monospace; max-width: 800px; margin: 0 auto;">
                <h1 style="border-bottom: 2px solid #00ffcc; padding-bottom: 10px;">⚡ ADRENALINE OSINT DASHBOARD</h1>
                <p style="color: #aaa;">Select a reconnaissance tool to execute directly from the dashboard:</p>

                <div style="margin-top: 20px; display: grid; gap: 15px;">
                    <div style="border: 1px solid #00ffcc33; padding: 15px; border-radius: 5px;">
                        <h3>🌐 DNS Lookup</h3>
                        <input id="adr-dns-input" type="text" placeholder="example.com" style="background:#111; color:#fff; border:1px solid #444; padding:8px; width:70%;">
                        <button onclick="
                            const val = document.getElementById('adr-dns-input').value;
                            window.NoreAPI.exitApp();
                            window.handle('adrenaline dns ' + val);
                        " style="padding:8px 15px; background:#00ffcc; color:#000; border:none; font-weight:bold; cursor:pointer;">Run DNS</button>
                    </div>

                    <div style="border: 1px solid #00ffcc33; padding: 15px; border-radius: 5px;">
                        <h3>📋 WHOIS / RDAP</h3>
                        <input id="adr-whois-input" type="text" placeholder="example.com" style="background:#111; color:#fff; border:1px solid #444; padding:8px; width:70%;">
                        <button onclick="
                            const val = document.getElementById('adr-whois-input').value;
                            window.NoreAPI.exitApp();
                            window.handle('adrenaline whois ' + val);
                        " style="padding:8px 15px; background:#00ffcc; color:#000; border:none; font-weight:bold; cursor:pointer;">Run WHOIS</button>
                    </div>

                    <div style="border: 1px solid #00ffcc33; padding: 15px; border-radius: 5px;">
                        <h3>🐙 GitHub Profile Recon</h3>
                        <input id="adr-gh-input" type="text" placeholder="username" style="background:#111; color:#fff; border:1px solid #444; padding:8px; width:70%;">
                        <button onclick="
                            const val = document.getElementById('adr-gh-input').value;
                            window.NoreAPI.exitApp();
                            window.handle('adrenaline github ' + val);
                        " style="padding:8px 15px; background:#00ffcc; color:#000; border:none; font-weight:bold; cursor:pointer;">Run GitHub</button>
                    </div>
                </div>

                <div style="margin-top: 30px;">
                    <button onclick="window.NoreAPI.exitApp()" style="padding: 10px 20px; background: #ff4444; color: #fff; border: none; cursor: pointer; font-weight: bold;">
                        Exit Dashboard
                    </button>
                </div>
            </div>
        `);
    }

    // --- Command Registration ---

    window.registerCommand(
        "adrenaline",
        "OSINT Reconnaissance Suite. Subcommands: dns, whois, github, headers, ui",
        async function (args) {
            if (!args) {
                print("<b>⚡ Adrenaline OSINT Suite</b>", true);
                print("Usage: adrenaline <subcommand> [target]");
                print("* <span class='cmd'>adrenaline ui</span> - Launch full-screen GUI", true);
                print("* <span class='cmd'>adrenaline dns &lt;domain&gt; [type]</span> - DNS lookup", true);
                print("* <span class='cmd'>adrenaline whois &lt;domain&gt;</span> - Domain RDAP lookup", true);
                print("* <span class='cmd'>adrenaline github &lt;username&gt;</span> - GitHub profile info", true);
                print("* <span class='cmd'>adrenaline headers &lt;url&gt;</span> - Fetch HTTP headers", true);
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
                case "ui":
                case "app":
                case "gui":
                    return launchDashboard();
                default:
                    print(`<span class='danger-text'>Unknown subcommand: ${subCmd}</span>`, true);
                    print("Available subcommands: dns, whois, github, headers, ui");
            }
        }
    );

    console.log("[adrenaline] OSINT Plugin loaded.");
})();
