import XLSX from "xlsx";

// ─── UAT Test Scenarios ────────────────────────────────────
const uatScenarios = [
  // ── AUTH ──
  ["AUTH-001", "Autentificare", "Login cu email valid din whitelist", "1. Acceseaza URL-ul aplicatiei\n2. Click 'Continua cu Google'\n3. Selecteaza cont Google cu email din whitelist", "Redirect catre Dashboard, user logat, avatar vizibil in header", "P1", "", "", ""],
  ["AUTH-002", "Autentificare", "Login cu email care NU e in whitelist", "1. Acceseaza URL-ul aplicatiei\n2. Click 'Continua cu Google'\n3. Selecteaza cont Google cu email care NU e in whitelist", "Mesaj de eroare: acces interzis. Nu se permite accesul la Dashboard.", "P1", "", "", ""],
  ["AUTH-003", "Autentificare", "Logout", "1. Fiind logat, click pe iconita LogOut din header (dreapta-sus)", "Redirect catre pagina de login. Sesiunea e inchisa.", "P2", "", "", ""],
  ["AUTH-004", "Autentificare", "Sesiune expirata", "1. Asteapta expirarea sesiunii (sau sterge cookie-urile)\n2. Incearca sa accesezi o pagina protejata", "Redirect automat catre pagina de login", "P2", "", "", ""],

  // ── DASHBOARD ──
  ["DASH-001", "Dashboard", "Afisare KPI-uri corecte", "1. Navigheaza la Dashboard\n2. Verifica cardurile KPI: Venituri, Cheltuieli, Profit, Nr. bonuri", "Valorile corespund cu datele din baza de date. Profitul = Venituri - Cheltuieli.", "P1", "", "", ""],
  ["DASH-002", "Dashboard", "Filtrare pe locatie", "1. Pe Dashboard, selecteaza 'MAGNOLIA' din dropdown locatie\n2. Apoi selecteaza 'ORIZONT'\n3. Apoi 'Toate locatiile'", "KPI-urile si graficele se actualizeaza corect per locatie selectata", "P1", "", "", ""],
  ["DASH-003", "Dashboard", "Filtrare pe perioada", "1. Selecteaza 'Luna curenta' din dropdown perioada\n2. Apoi 'Trimestru'\n3. Apoi 'An curent'", "Datele se actualizeaza corespunzator perioadei selectate", "P1", "", "", ""],
  ["DASH-004", "Dashboard", "Grafic evolutie venituri", "1. Pe Dashboard, verifica graficul 'Evolutia veniturilor'\n2. Compara valorile barurilor cu datele din Incasari Zilnice", "Graficul afiseaza corect veniturile pe luni. Valorile corespund.", "P2", "", "", ""],
  ["DASH-005", "Dashboard", "Raport vechime facturi", "1. Verifica sectiunea 'Raport vechime'\n2. Compara cu facturile neplatite din Intrare Facturi", "Gruparea pe intervale (0-30, 31-60, 61-90, 90+) este corecta", "P2", "", "", ""],
  ["DASH-006", "Dashboard", "Alerte facturi scadente", "1. Verifica sectiunea 'Alerte facturi scadente'\n2. Compara cu facturile cu data scadenta depasita", "Se afiseaza doar facturile cu scadenta depasita si status UNPAID/PARTIAL", "P2", "", "", ""],

  // ── INCASARI ZILNICE ──
  ["INC-001", "Incasari Zilnice", "Adaugare incasare (VANZARE)", "1. Navigheaza la Incasari Zilnice\n2. Click 'Adauga incasare'\n3. Completeaza: Locatie=MAGNOLIA, Data=azi, Tip=VANZARE, Suma=150, Metoda=CASH\n4. Click 'Salveaza'", "Incasarea apare in tabel cu badge verde 'VANZARE', suma 150 RON, CASH", "P1", "", "", ""],
  ["INC-002", "Incasari Zilnice", "Adaugare incasare (RETUR)", "1. Click 'Adauga incasare'\n2. Completeaza: Tip=RETUR, Suma=25, Metoda=CARD\n3. Salveaza", "Incasarea apare cu badge rosu 'RETUR'", "P2", "", "", ""],
  ["INC-003", "Incasari Zilnice", "Editare incasare", "1. Click pe iconita creion de pe o incasare existenta\n2. Modifica suma din 150 in 200\n3. Salveaza", "Suma se actualizeaza la 200 RON in tabel", "P1", "", "", ""],
  ["INC-004", "Incasari Zilnice", "Stergere incasare", "1. Click pe iconita cos de gunoi\n2. Confirma stergerea in dialog", "Incasarea dispare din tabel. Numarul total de incasari scade cu 1.", "P1", "", "", ""],
  ["INC-005", "Incasari Zilnice", "Filtrare pe locatie", "1. Selecteaza 'MAGNOLIA' din dropdown locatie\n2. Verifica ca toate randurile arata locatia MAGNOLIA", "Se afiseaza doar incasarile de la MAGNOLIA", "P2", "", "", ""],
  ["INC-006", "Incasari Zilnice", "Cautare dupa descriere", "1. Tasteaza un text din descrierea unei incasari in bara de cautare", "Se filtreaza doar incasarile care contin textul cautat", "P2", "", "", ""],
  ["INC-007", "Incasari Zilnice", "Sortare dupa suma", "1. Click pe header-ul coloanei 'Suma'", "Randurile se sorteaza crescator/descrescator dupa suma", "P3", "", "", ""],
  ["INC-008", "Incasari Zilnice", "Export CSV", "1. Click pe butonul 'Export CSV'", "Se descarca un fisier .csv cu datele filtrate curente", "P2", "", "", ""],
  ["INC-009", "Incasari Zilnice", "Paginare", "1. Adauga peste 20 de incasari\n2. Navigheaza la pagina 2 cu butoanele < >", "Paginarea functioneaza corect, se afiseaza 20 randuri per pagina", "P3", "", "", ""],
  ["INC-010", "Incasari Zilnice", "Vizualizare detalii", "1. Click pe iconita ochi de pe o incasare", "Se deschide un modal cu toate detaliile incasarii", "P3", "", "", ""],

  // ── INTRARE FACTURI ──
  ["INF-001", "Intrare Facturi", "Adaugare factura intrare", "1. Navigheaza la Intrare Facturi\n2. Click 'Adauga factura'\n3. Completeaza: Locatie=MAGNOLIA, An=2026, Luna=IANUARIE, Categorie P&L=COGS, Categorie=BAR, Nr.Factura=F001, Furnizor=Test, Total=1000\n4. Salveaza", "Factura apare in tabel cu status NEPLATIT, suma 1000 RON", "P1", "", "", ""],
  ["INF-002", "Intrare Facturi", "Editare factura", "1. Click creion pe o factura existenta\n2. Modifica totalul\n3. Salveaza", "Totalul se actualizeaza in tabel", "P1", "", "", ""],
  ["INF-003", "Intrare Facturi", "Marcare ca platita", "1. Click pe iconita bifat (check) de pe o factura UNPAID", "Status-ul se schimba in PLATIT. Badge-ul devine verde.", "P1", "", "", ""],
  ["INF-004", "Intrare Facturi", "Stergere factura", "1. Click pe cos de gunoi\n2. Confirma stergerea", "Factura dispare din tabel", "P1", "", "", ""],
  ["INF-005", "Intrare Facturi", "Filtrare pe status", "1. Selecteaza status 'UNPAID' din dropdown", "Se afiseaza doar facturile neplatite", "P2", "", "", ""],
  ["INF-006", "Intrare Facturi", "Filtrare pe an", "1. Selecteaza anul 2026 din dropdown", "Se afiseaza doar facturile din 2026", "P2", "", "", ""],
  ["INF-007", "Intrare Facturi", "Cautare dupa numar factura", "1. Tasteaza un numar de factura in bara de cautare", "Se afiseaza doar factura cu numarul respectiv", "P2", "", "", ""],
  ["INF-008", "Intrare Facturi", "Export CSV", "1. Click pe 'Export CSV'", "Se descarca CSV cu facturile filtrate", "P2", "", "", ""],

  // ── IESIRE FACTURI ──
  ["OUT-001", "Iesire Facturi", "Adaugare factura iesire", "1. Navigheaza la Iesire Facturi\n2. Click 'Adauga factura'\n3. Completeaza: An=2026, Luna=IANUARIE, Nr.Factura=E001, Client=Test, Total=500\n4. Salveaza", "Factura apare in tabel cu status NEPLATIT, suma 500 RON", "P1", "", "", ""],
  ["OUT-002", "Iesire Facturi", "Editare factura iesire", "1. Click creion pe o factura existenta\n2. Modifica totalul\n3. Salveaza", "Totalul se actualizeaza in tabel", "P1", "", "", ""],
  ["OUT-003", "Iesire Facturi", "Stergere factura iesire", "1. Click cos de gunoi\n2. Confirma", "Factura dispare", "P1", "", "", ""],
  ["OUT-004", "Iesire Facturi", "Filtrare si cautare", "1. Filtreaza pe status PAID\n2. Cauta dupa numele clientului", "Rezultatele respecta ambele filtre aplicate", "P2", "", "", ""],

  // ── IMPORT EXCEL ──
  ["IMP-001", "Import Excel", "Import facturi intrare — flux complet", "1. Navigheaza la Import Excel\n2. Selecteaza 'Facturi intrare'\n3. Incarca fisier .xlsx cu sheet INTRARE FACTURI\n4. Selecteaza sheet-ul\n5. Verifica maparea coloanelor (auto-mapare)\n6. Click 'Urmatorul' pentru previzualizare\n7. Verifica datele\n8. Click 'Importa'", "Import reusit. Se afiseaza: X facturi create, Y erori, Z sarite. Facturile apar in Intrare Facturi.", "P1", "", "", ""],
  ["IMP-002", "Import Excel", "Import facturi — mapare gresita", "1. Incarca fisier cu headere diferite de cele asteptate\n2. Verifica ca auto-maparea nu a mapat toate campurile\n3. Corecteaza manual maparea\n4. Importa", "Dupa corectarea manuala, importul functioneaza corect", "P1", "", "", ""],
  ["IMP-003", "Import Excel", "Import incasari zilnice — flux complet", "1. Selecteaza 'Incasari zilnice'\n2. Incarca fisier .xlsx cu sheet Income\n3. Selecteaza sheet-ul\n4. Verifica previzualizarea (detectie automata MAGNOLIA/ORIZONT)\n5. Click 'Importa'", "Import reusit. Incasarile apar pe pagina Incasari Zilnice cu locatiile corecte.", "P1", "", "", ""],
  ["IMP-004", "Import Excel", "Re-import incasari (upsert)", "1. Importa acelasi fisier de incasari de doua ori", "A doua oara, inregistrarile existente sunt actualizate (nu duplicate). Se raporteaza 'updated' count.", "P1", "", "", ""],
  ["IMP-005", "Import Excel", "Import fisier invalid", "1. Incarca un fisier .txt sau .csv in loc de .xlsx", "Eroare clara: fisierul nu este in format .xlsx", "P2", "", "", ""],
  ["IMP-006", "Import Excel", "Import sheet gol", "1. Incarca un .xlsx cu un sheet fara date", "Mesaj ca nu s-au gasit date de importat", "P2", "", "", ""],
  ["IMP-007", "Import Excel", "Anulare import", "1. Incepe procesul de import\n2. La pasul de previzualizare, click 'Inapoi' sau 'X'", "Se revine la pasul anterior fara a importa nimic", "P3", "", "", ""],

  // ── RAPOARTE P&L ──
  ["PNL-001", "P&L", "Vizualizare P&L per locatie", "1. Navigheaza la P&L\n2. Selecteaza an=2026, locatie=MAGNOLIA", "Se afiseaza tabelul P&L cu 12 coloane lunare + total. Valorile corespund cu facturile importate.", "P1", "", "", ""],
  ["PNL-002", "P&L", "Calcul profit corect", "1. Verifica linia 'Profit net'\n2. Compara: Profit = Venituri - COGS - People - OPEX - Costuri Fixe - Taxe", "Calculele sunt corecte matematic", "P1", "", "", ""],
  ["PNL-003", "P&L", "Schimbare an", "1. Selecteaza un an diferit", "Datele se actualizeaza pentru anul selectat", "P2", "", "", ""],

  // ── RAPOARTE CASH FLOW ──
  ["CF-001", "Cash Flow", "Vizualizare Cash Flow", "1. Navigheaza la Cash Flow\n2. Selecteaza an si locatie", "Tabelul afiseaza sold initial, intrari, iesiri, sold final pe luni", "P1", "", "", ""],
  ["CF-002", "Cash Flow", "Verificare sold final", "1. Verifica: Sold final = Sold initial + Total intrari - Total iesiri", "Calculul matematic este corect", "P1", "", "", ""],

  // ── RAPOARTE COGS ──
  ["COGS-001", "COGS", "Vizualizare COGS", "1. Navigheaza la COGS\n2. Selecteaza an si locatie", "Tabelul afiseaza stocuri si costuri per categorie (materie prima, marfa, ambalaje)", "P1", "", "", ""],
  ["COGS-002", "COGS", "Verificare calcul cost", "1. Verifica: Cost = Stoc initial + Achizitii - Iesiri - Stoc final", "Formula este corecta pentru fiecare categorie", "P1", "", "", ""],

  // ── FURNIZORI ──
  ["SUP-001", "Furnizori", "Adaugare furnizor", "1. Navigheaza la Furnizori\n2. Click 'Adauga furnizor'\n3. Introdu numele: 'Test Furnizor'\n4. Salveaza", "Furnizorul apare in lista cu 0 facturi", "P1", "", "", ""],
  ["SUP-002", "Furnizori", "Editare furnizor", "1. Click creion pe un furnizor\n2. Modifica numele\n3. Salveaza", "Numele se actualizeaza in tabel", "P2", "", "", ""],
  ["SUP-003", "Furnizori", "Stergere furnizor fara facturi", "1. Click cos de gunoi pe un furnizor FARA facturi\n2. Confirma", "Furnizorul dispare din lista", "P2", "", "", ""],
  ["SUP-004", "Furnizori", "Stergere furnizor CU facturi", "1. Click cos de gunoi pe un furnizor cu facturi asociate", "Avertisment: 'Furnizorul are X facturi asociate. Sterge mai intai facturile.'", "P1", "", "", ""],
  ["SUP-005", "Furnizori", "Cautare furnizori", "1. Tasteaza in bara de cautare", "Lista se filtreaza in timp real", "P3", "", "", ""],
  ["SUP-006", "Furnizori", "Export CSV", "1. Click 'Export CSV'", "Se descarca CSV cu: Nume, Nr facturi, Total cheltuieli", "P3", "", "", ""],

  // ── CLIENTI ──
  ["CUS-001", "Clienti", "Adaugare client", "1. Navigheaza la Clienti\n2. Click 'Adauga client'\n3. Introdu numele\n4. Salveaza", "Clientul apare in lista cu 0 facturi", "P1", "", "", ""],
  ["CUS-002", "Clienti", "Stergere client cu facturi", "1. Click cos de gunoi pe un client cu facturi", "Avertisment despre facturile asociate", "P1", "", "", ""],
  ["CUS-003", "Clienti", "Cautare si export", "1. Cauta un client\n2. Export CSV", "Cautarea functioneaza. CSV-ul contine datele filtrate.", "P3", "", "", ""],

  // ── LOCATII ──
  ["LOC-001", "Locatii", "Vizualizare statistici locatie", "1. Navigheaza la Locatii\n2. Verifica cardurile MAGNOLIA si ORIZONT", "Fiecare card afiseaza: Venituri, Cheltuieli, Net. Valorile corespund.", "P1", "", "", ""],
  ["LOC-002", "Locatii", "Editare locatie", "1. Click creion pe o locatie\n2. Modifica adresa\n3. Salveaza", "Adresa se actualizeaza", "P2", "", "", ""],

  // ── SETARI ──
  ["SET-001", "Setari", "Adaugare email in whitelist", "1. Navigheaza la Setari\n2. Introdu un email nou in campul de input\n3. Click 'Adauga'", "Email-ul apare in lista de acces", "P1", "", "", ""],
  ["SET-002", "Setari", "Stergere email din whitelist", "1. Click pe X de langa un email (altul decat al tau)", "Email-ul dispare din lista", "P1", "", "", ""],
  ["SET-003", "Setari", "Nu se poate sterge propriul email", "1. Incearca sa stergi email-ul cu care esti logat", "Butonul de stergere nu e disponibil sau se afiseaza o eroare", "P2", "", "", ""],

  // ── CAUTARE GLOBALA ──
  ["SRCH-001", "Cautare Globala", "Cautare cu Ctrl+K", "1. Apasa Ctrl+K\n2. Tasteaza un termen (ex: numele unui furnizor)", "Se deschide dialogul de cautare. Rezultatele apar in timp real.", "P2", "", "", ""],
  ["SRCH-002", "Cautare Globala", "Navigare din rezultate", "1. Cauta un furnizor\n2. Click pe rezultat", "Se navigheaza la pagina corespunzatoare (ex: Furnizori)", "P2", "", "", ""],

  // ── RESPONSIVE / UI ──
  ["UI-001", "UI/UX", "Sidebar pe desktop", "1. Deschide aplicatia pe desktop (> 1024px)", "Sidebar-ul este vizibil permanent in stanga. Continutul are margin-left corespunzator.", "P2", "", "", ""],
  ["UI-002", "UI/UX", "Sidebar pe mobil", "1. Deschide aplicatia pe mobil (< 1024px)\n2. Apasa iconita hamburger\n3. Apasa pe un link din meniu", "Sidebar-ul se deschide ca overlay. Dupa click pe un link, se inchide automat.", "P2", "", "", ""],
  ["UI-003", "UI/UX", "Header centrat", "1. Verifica titlul paginii in header pe toate paginile", "Titlul este centrat orizontal si vizibil pe fiecare pagina", "P3", "", "", ""],
  ["UI-004", "UI/UX", "Padding consistent", "1. Navigheaza prin mai multe pagini\n2. Verifica ca exista padding stanga/dreapta pe continut", "Nu exista continut lipit de marginea ecranului sau de sidebar", "P3", "", "", ""],
];

// ─── ERRATA / Known Issues ───────────────────────────────────
const errata = [
  ["ERR-001", "Import Excel", "Medium", "Fisierele cu headere duplicate (ex: doua coloane 'Suma') pot cauza mapari incorecte", "Renumiti coloanele duplicate in Excel inainte de import", "Known"],
  ["ERR-002", "Import Excel", "Low", "Importul incasari zilnice necesita exact formatul cu coloanele MAGNOLIA si ORIZONT pe aceeasi linie", "Asigurati-va ca sheet-ul respecta formatul standard", "Known"],
  ["ERR-003", "Incasari Zilnice", "Low", "Gruparea pe data poate arata data in format ISO in loc de DD/MM/YYYY in unele cazuri", "Functioneaza corect, doar formatul e inconsistent", "Known"],
  ["ERR-004", "Dashboard", "Low", "Graficele afiseaza date doar daca exista inregistrari DailyIncome sau IncomingInvoice", "Importati date mai intai pentru a vedea graficele", "By Design"],
  ["ERR-005", "Facturi", "Medium", "Status-ul facturilor importate se calculeaza din paidAmount vs totalAmount, nu din coloana status Excel", "Verificati sumele platite la import", "By Design"],
  ["ERR-006", "Auth", "High", "Pe Vercel, AUTH_SECRET trebuie setat explicit in Environment Variables", "Verificati ca AUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET sunt setate pe proiectul Vercel corect", "Resolved"],
  ["ERR-007", "Furnizori/Clienti", "Low", "Numarul de facturi afiseaza doar primele 100-500 de facturi (paginare limitata la fetch)", "Pentru numar exact, verificati direct in baza de date", "Known"],
  ["ERR-008", "Import Excel", "Low", "Campuri de data din Excel pot fi in format serial Excel (numere). Sistemul le converteste automat.", "Daca datele apar incorecte, verificati formatul in Excel", "Known"],
];

// ─── Build workbook ────────────────────────────────────────
const wb = XLSX.utils.book_new();

// Sheet 1: UAT Scenarios
const uatHeaders = ["ID", "Modul", "Scenariu", "Pasi de Testare", "Rezultat Asteptat", "Prioritate", "Status", "Testat De", "Observatii"];
const uatData = [uatHeaders, ...uatScenarios];
const ws1 = XLSX.utils.aoa_to_sheet(uatData);

// Set column widths
ws1["!cols"] = [
  { wch: 12 },  // ID
  { wch: 18 },  // Modul
  { wch: 40 },  // Scenariu
  { wch: 60 },  // Pasi
  { wch: 50 },  // Rezultat
  { wch: 10 },  // Prioritate
  { wch: 12 },  // Status
  { wch: 15 },  // Testat De
  { wch: 30 },  // Observatii
];
XLSX.utils.book_append_sheet(wb, ws1, "UAT Scenarios");

// Sheet 2: Errata
const errataHeaders = ["ID", "Modul", "Severitate", "Descriere", "Workaround / Solutie", "Status"];
const errataData = [errataHeaders, ...errata];
const ws2 = XLSX.utils.aoa_to_sheet(errataData);
ws2["!cols"] = [
  { wch: 12 },
  { wch: 18 },
  { wch: 12 },
  { wch: 70 },
  { wch: 50 },
  { wch: 12 },
];
XLSX.utils.book_append_sheet(wb, ws2, "Errata");

// Sheet 3: Summary
const summaryData = [
  ["Moro Coffee Manager — UAT Report"],
  [],
  ["Data generare", new Date().toLocaleDateString("ro-RO")],
  ["Versiune aplicatie", "v0.1.0"],
  ["Numar total scenarii", uatScenarios.length],
  ["Scenarii P1 (Critice)", uatScenarios.filter(s => s[5] === "P1").length],
  ["Scenarii P2 (Importante)", uatScenarios.filter(s => s[5] === "P2").length],
  ["Scenarii P3 (Nice to have)", uatScenarios.filter(s => s[5] === "P3").length],
  [],
  ["Numar errata", errata.length],
  ["Errata High", errata.filter(e => e[2] === "High").length],
  ["Errata Medium", errata.filter(e => e[2] === "Medium").length],
  ["Errata Low", errata.filter(e => e[2] === "Low").length],
  [],
  ["Module acoperite:"],
  ["- Autentificare (AUTH)"],
  ["- Dashboard (DASH)"],
  ["- Incasari Zilnice (INC)"],
  ["- Intrare Facturi (INF)"],
  ["- Iesire Facturi (OUT)"],
  ["- Import Excel (IMP)"],
  ["- P&L (PNL)"],
  ["- Cash Flow (CF)"],
  ["- COGS (COGS)"],
  ["- Furnizori (SUP)"],
  ["- Clienti (CUS)"],
  ["- Locatii (LOC)"],
  ["- Setari (SET)"],
  ["- Cautare Globala (SRCH)"],
  ["- UI/UX (UI)"],
  [],
  ["Instructiuni:"],
  ["1. Completati coloana 'Status' cu: PASS / FAIL / BLOCKED / N/A"],
  ["2. Completati coloana 'Testat De' cu numele testerului"],
  ["3. Adaugati observatii relevante in coloana 'Observatii'"],
  ["4. Incepeti cu scenariile P1 (critice), apoi P2, apoi P3"],
];
const ws3 = XLSX.utils.aoa_to_sheet(summaryData);
ws3["!cols"] = [{ wch: 35 }, { wch: 30 }];
XLSX.utils.book_append_sheet(wb, ws3, "Sumar");

// Write file
const outPath = "docs/Moro-UAT-Scenarios.xlsx";
XLSX.writeFile(wb, outPath);
console.log(`UAT Excel generated: ${outPath}`);
console.log(`  - ${uatScenarios.length} test scenarios`);
console.log(`  - ${errata.length} errata items`);
