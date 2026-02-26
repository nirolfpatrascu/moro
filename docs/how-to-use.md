# Moro Coffee Manager — Ghid de Utilizare

## Cuprins

1. [Autentificare](#1-autentificare)
2. [Dashboard (Pagina principala)](#2-dashboard-pagina-principala)
3. [Incasari Zilnice](#3-incasari-zilnice)
4. [Intrare Facturi](#4-intrare-facturi)
5. [Iesire Facturi](#5-iesire-facturi)
6. [Import Excel](#6-import-excel)
7. [Rapoarte: P&L](#7-rapoarte-pl)
8. [Rapoarte: Cash Flow](#8-rapoarte-cash-flow)
9. [Rapoarte: COGS](#9-rapoarte-cogs)
10. [Furnizori](#10-furnizori)
11. [Clienti](#11-clienti)
12. [Locatii](#12-locatii)
13. [Setari](#13-setari)
14. [Cautare Globala](#14-cautare-globala)

---

## 1. Autentificare

### Cum te autentifici
- Acceseaza aplicatia la adresa URL furnizata (ex: `https://moro-woad.vercel.app`)
- Apasa butonul **"Continua cu Google"**
- Selecteaza contul Google dorit
- **Nota:** Doar adresele de email adaugate in lista de acces (whitelist) pot accesa aplicatia

### Deconectare
- Click pe iconita **Log Out** din coltul dreapta-sus al header-ului

---

## 2. Dashboard (Pagina principala)

Pagina **Dashboard** (`/`) ofera o privire de ansamblu asupra afacerii.

### Selectare perioada
- Foloseste dropdown-ul din partea de sus pentru a selecta perioada dorita:
  - **Luna curenta** — date din luna in curs
  - **Trimestru** — ultimele 3 luni
  - **An curent** — date de la inceputul anului

### Selectare locatie
- Dropdown pentru filtrare pe locatie:
  - **Toate locatiile** — date cumulate
  - **MAGNOLIA** — doar locatia MG
  - **ORIZONT** — doar locatia O

### Carduri KPI
Afiseaza indicatori principali:
- **Venituri totale** — suma totala vanzari
- **Total cheltuieli** — suma facturi intrare
- **Profit net** — venituri minus cheltuieli
- **Numar bonuri** — total bonuri emise

### Grafice si tabele
- **Evolutia veniturilor** — grafic cu baruri pe luni (bar + bucatarie)
- **Venituri pe locatie** — grafic comparativ MAGNOLIA vs ORIZONT
- **Cheltuieli pe categorie** — distributie COGS, OPEX, Costuri fixe, Taxe
- **Top furnizori** — top 5 furnizori dupa total cheltuieli
- **Raport vechime facturi** — facturi neplatite grupate pe intervale (0-30 zile, 31-60, 61-90, 90+)
- **Tranzactii recente** — ultimele 10 miscari
- **Alerte facturi scadente** — facturi cu termen depasit

---

## 3. Incasari Zilnice

Pagina **Incasari Zilnice** (`/income`) gestioneaza bonurile/incasarile zilnice per locatie.

### Vizualizare
- Incasarile sunt grupate pe **data** in tabel
- Fiecare rand arata: data, locatie, tip, descriere, categorie, suma, metoda plata, numar bon
- Badge-uri colorate pentru tipul tranzactiei: **VANZARE** (verde), **RETUR** (rosu), **CHELTUIALA** (galben)
- Badge-uri pentru metoda plata: **CASH**, **CARD**, **TRANSFER**

### Filtrare
- **Cautare** — cauta dupa descriere, numar bon sau note
- **Locatie** — filtreaza pe MAGNOLIA / ORIZONT / Toate
- **Tip** — filtreaza pe SALE / REFUND / EXPENSE
- **Metoda plata** — filtreaza pe CASH / CARD / TRANSFER

### Sortare
- Click pe header-ul coloanei **Suma** pentru a sorta crescator/descrescator

### Adaugare incasare
1. Click pe butonul **"Adauga incasare"** (dreapta-sus)
2. Completeaza formularul:
   - **Locatie** (obligatoriu) — selecteaza MAGNOLIA sau ORIZONT
   - **Data** (obligatoriu) — selecteaza data
   - **Tip** — VANZARE / RETUR / CHELTUIALA
   - **Categorie** — BAR / BUCATARIE / DIVERSE
   - **Suma** (obligatoriu) — suma tranzactiei
   - **Metoda plata** — CASH / CARD / TRANSFER
   - **Numar bon** — optional
   - **Descriere** — optional
   - **Note** — optional
3. Click **"Salveaza"**

### Editare / Stergere
- **Editare**: Click pe iconita creion de pe rand → formularul se deschide pre-completat
- **Vizualizare**: Click pe iconita ochi pentru detalii complete
- **Stergere**: Click pe iconita cos de gunoi → confirma stergerea in dialog

### Export
- Click pe **"Export CSV"** pentru a descarca datele filtrate in format CSV

### Paginare
- Navigheaza intre pagini cu butoanele **< Inapoi / Inainte >** din partea de jos

---

## 4. Intrare Facturi

Pagina **Intrare Facturi** (`/incoming`) gestioneaza facturile primite de la furnizori.

### Vizualizare
- Tabel cu coloane: Nr. Factura, Furnizor, Locatie, Categorie P&L, Categorie, Total, Platit, Status
- Status-uri: **PLATIT** (verde), **PARTIAL** (galben), **NEPLATIT** (rosu)

### Filtrare
- **Cautare** — cauta dupa numar factura, furnizor, note
- **Locatie** — filtreaza pe locatie
- **Status** — PAID / UNPAID / PARTIAL
- **An** — filtreaza pe an

### Sortare
- Click pe header-ul coloanei **Total** pentru sortare

### Adaugare factura
1. Click pe **"Adauga factura"**
2. Completeaza:
   - **Locatie**, **An**, **Luna** (obligatorii)
   - **Categorie P&L** — COGS / COSTFIX / OPEX / TAXE
   - **Categorie**, **Subcategorie**
   - **Nr. Factura** (obligatoriu)
   - **Furnizor** — selecteaza din lista sau adauga nou
   - **Data emitere**, **Scadenta**
   - **Suma fara TVA**, **TVA**, **Total** (obligatoriu)
   - **Suma platita**, **Rest de plata**
   - **An/Luna/Zi plata**
   - **Observatii**
3. Click **"Salveaza"**

### Editare / Stergere / Vizualizare
- Aceleasi actiuni ca la Incasari Zilnice (iconite pe fiecare rand)

### Marcare ca platita
- Click pe iconita bifat (check) de pe randul facturii pentru a o marca ca platita rapid

### Export / Import
- **Export CSV** — descarca datele curente
- **Import** — link rapid catre pagina Import Excel

---

## 5. Iesire Facturi

Pagina **Iesire Facturi** (`/outgoing`) gestioneaza facturile emise catre clienti.

### Vizualizare
- Tabel cu: Nr. Factura, Client, An/Luna, Data emitere, Total, Platit, Neachitat, Status

### Filtrare si Sortare
- Aceleasi optiuni ca la Intrare Facturi: cautare, locatie, status, an

### Adaugare / Editare / Stergere
- Flux identic cu Intrare Facturi, dar cu campuri specifice facturilor emise:
  - **Client** in loc de Furnizor
  - **Suma fara TVA**, **Total**, **Achitat**, **Neachitat**

---

## 6. Import Excel

Pagina **Import Excel** (`/import`) permite importul in masa al datelor din fisiere Excel (.xlsx).

### Tip 1: Import Facturi Intrare

1. **Selectare tip import** — alege **"Facturi intrare"**
2. **Incarca fisier** — drag & drop sau click pentru a selecta fisierul .xlsx
3. **Selecteaza sheet-ul** — alege sheet-ul care contine facturile (ex: "INTRARE FACTURI")
4. **Configurare mapare coloane**:
   - Sistemul incearca sa mapeze automat coloanele din Excel cu campurile bazei de date
   - Verifica si ajusteaza maparea pentru fiecare camp:
     - Locatie, An, Luna, CATEGORIE P&L, Categorie, Subcategorie
     - NR Factura, Denumire Firma, Data Emitere, Scadenta
     - Suma fara TVA, Val TVA, Suma de plata, Achitati
     - An Plata, Luna Plata, Data plata, De plata, Obs
   - Campurile obligatorii sunt marcate cu **"*"**
5. **Previzualizare** — verifica primele 10 randuri inainte de import
6. **Import** — click pe **"Importa X facturi"**
7. **Rezultat** — se afiseaza numarul de facturi importate cu succes, erori, si facturi sarite

### Tip 2: Import Incasari Zilnice

1. **Selectare tip import** — alege **"Incasari zilnice"**
2. **Incarca fisier** — selecteaza fisierul .xlsx cu sheet-ul "Income"
3. **Selecteaza sheet-ul** — alege sheet-ul corespunzator
4. **Previzualizare** — sistemul detecteaza automat coloanele MAGNOLIA si ORIZONT
   - Nu e necesara configurare manuala a maparii
   - Se afiseaza: data, locatie, total vanzari, nr bonuri, bar, bucatarie, cash, card, tips
5. **Import** — click pe **"Importa"**
   - Datele existente cu aceeasi data + locatie sunt **actualizate** (upsert), nu duplicate
6. **Rezultat** — se afiseaza: create noi, actualizate, erori

### Note importante
- Fisierul trebuie sa fie in format **.xlsx**
- Dimensiunea maxima: depinde de configurarea serverului
- Importul este **aditiv** — nu sterge date existente
- Re-importul aceluiasi fisier **actualizeaza** inregistrarile existente (nu creeaza duplicate)

---

## 7. Rapoarte: P&L

Pagina **P&L** (`/dashboard/pnl`) afiseaza raportul Profit & Loss lunar.

### Functionalitati
- Selectare **an** si **locatie** din dropdown-uri
- Tabel cu coloane pentru fiecare luna (Ianuarie - Decembrie) + Total an
- Sectiuni:
  - **A. VENITURI** — total vanzari, numar bonuri, cec mediu, vanzari bar/bucatarie
  - **B. COGS** — cost marfa, materie prima, transport, ambalaje
  - **C. PEOPLE** — salarii, taxe, tichete masa, bonusuri
  - **D. OPEX** — licente, consulting, marketing, diverse
  - **E. COSTURI FIXE** — chirii, utilitati, comisioane bancare
  - **F. TAXE** — impozit venit, TVA
  - **G. FINANTARE** — investitii imobilizate
  - **PROFIT** — brut, operational, net

---

## 8. Rapoarte: Cash Flow

Pagina **Cash Flow** (`/dashboard/cashflow`) afiseaza fluxul de numerar lunar.

### Functionalitati
- Selectare **an** si **locatie**
- Sectiuni:
  - **Sold initial**
  - **INTRARI** — incasari vanzari, facturi incasate, livrari, tips, cash/card/transfer
  - **IESIRI COGS** — plati cash furnizori bar, bucatarie, consumabile
  - **IESIRI OPEX** — personal, licente, servicii, marketing
  - **IESIRI COSTURI FIXE** — chirii, utilitati, banca
  - **IESIRI TAXE** — impozit, TVA
  - **ALTE IESIRI** — dividende, aport capital
  - **Sold final**

---

## 9. Rapoarte: COGS

Pagina **COGS** (`/dashboard/cogs`) afiseaza costul bunurilor vandute pe luni.

### Functionalitati
- Selectare **an** si **locatie**
- Sectiuni per categorie:
  - **Materie Prima** — stoc initial, achizitii, iesiri, stoc final, cost
  - **Marfa** — aceeasi structura
  - **Ambalaje** — aceeasi structura

---

## 10. Furnizori

Pagina **Furnizori** (`/suppliers`) gestioneaza lista de furnizori.

### Vizualizare
- Tabel cu: Nume furnizor, Nr. facturi asociate, Total cheltuieli

### Actiuni
- **Cautare** — cauta furnizori dupa nume
- **Adauga furnizor** — click pe butonul "Adauga furnizor", introdu numele
- **Editeaza** — click pe iconita creion
- **Sterge** — click pe cos de gunoi (avertisment daca are facturi asociate)
- **Export CSV** — descarca lista in format CSV

---

## 11. Clienti

Pagina **Clienti** (`/customers`) gestioneaza lista de clienti.

### Vizualizare
- Tabel cu: Nume client, Nr. facturi asociate

### Actiuni
- Identice cu Furnizori: cautare, adaugare, editare, stergere, export CSV

---

## 12. Locatii

Pagina **Locatii** (`/locations`) afiseaza locatiile cu statistici.

### Vizualizare
- Card per locatie cu:
  - **Cod** (MG / O), **Nume** (MAGNOLIA / ORIZONT), **Adresa**
  - **Venituri** — total vanzari pe locatie
  - **Cheltuieli** — total facturi intrare pe locatie
  - **Net** — diferenta venituri - cheltuieli (verde daca pozitiv, rosu daca negativ)

### Actiuni
- **Editeaza** — modifica nume, cod, adresa locatiei
- **Sterge** — sterge locatia (avertisment daca are date asociate)

---

## 13. Setari

Pagina **Setari** (`/settings`) gestioneaza accesul la aplicatie.

### Contul tau
- Afiseaza email-ul si imaginea contului curent logat

### Lista de acces (Email Whitelist)
- Afiseaza toate adresele de email cu acces la aplicatie
- **Adauga email** — introdu o adresa noua si apasa "Adauga"
- **Sterge email** — click pe iconita X de langa adresa (nu poti sterge propria adresa)
- Doar persoanele cu email in aceasta lista pot accesa aplicatia prin Google OAuth

---

## 14. Cautare Globala

### Cum functioneaza
- Click pe bara de cautare din header sau apasa **Ctrl + K**
- Tasteaza termenul dorit — se cauta in facturi, furnizori, clienti
- Click pe un rezultat pentru a naviga la pagina respectiva

---

## Navigare

### Sidebar (Meniu lateral)
- **Dashboard** — pagina principala
- **Incasari Zilnice** — bonuri si incasari
- **Intrare Facturi** — facturi de la furnizori
- **Iesire Facturi** — facturi catre clienti
- **Import Excel** — import in masa
- **Rapoarte**: P&L, Cash Flow, COGS
- **Referinte**: Furnizori, Clienti, Locatii
- **Setari**

### Pe mobil
- Apasa iconita **hamburger** (trei linii) din coltul stanga-sus pentru a deschide meniul lateral
- Apasa **X** sau in afara meniului pentru a-l inchide

---

## Formate si Conventii

| Element | Format |
|---------|--------|
| Moneda | RON (fara zecimale daca > 100, cu 2 zecimale daca < 100) |
| Data | DD/MM/YYYY (format european) |
| Locatii | MAGNOLIA (MG), ORIZONT (O) |
| Luni | IANUARIE, FEBRUARIE, ..., DECEMBRIE |
| Categorii P&L | COGS, COSTFIX, OPEX, TAXE |
| Tipuri tranzactie | VANZARE, RETUR, CHELTUIALA |
| Metode plata | CASH, CARD, TRANSFER |
| Status factura | PLATIT, PARTIAL, NEPLATIT |

---

## Sfaturi si Trucuri

1. **Importa mai intai datele istorice** din Excel folosind pagina Import, apoi adauga manual pe viitor
2. **Verifica maparea coloanelor** la import — sistemul incearca auto-mapare dar verifica mereu
3. **Re-importul este sigur** — incasarile zilnice sunt actualizate (upsert), nu duplicate
4. **Exporta regulat** — foloseste Export CSV ca backup pe fiecare pagina
5. **Foloseste Ctrl+K** pentru cautare rapida in toata aplicatia
6. **Verifica dashboard-ul** periodic pentru alerte facturi scadente
7. **Adauga toate email-urile** colegilor in Setari pentru a le oferi acces
