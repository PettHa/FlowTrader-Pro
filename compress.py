import os
import sys

# --- Konfigurasjon ---
OUTPUT_FILENAME = "prosjekt_innhold.txt"

# Filer som skal ignoreres (nøyaktig navn)
IGNORE_FILES = {
    'package-lock.json',
    '.env',
    'compress.py',
    'todo.md',
    OUTPUT_FILENAME,  # Ignorer selve output-filen
    os.path.basename(__file__) # Ignorer dette scriptet
    # Legg til flere filnavn her om nødvendig
    # f.eks. '.DS_Store' for macOS
}

# Mapper som skal ignoreres (scriptet går ikke inn i disse)
IGNORE_DIRS = {''
    'assets',
    'node_modules',
    '.git',            # Viktig for å unngå git-historikk/objekter
    '.vscode',         # Vanlig mappe for VS Code-innstillinger
    '__pycache__',     # Python bytecode cache
    '.venv',           # Vanlige navn for virtuelle miljøer
    'venv',
    'dist',            # Vanlig for byggeartefakter
    'build',
    'market_data',
                          # Vanlig for byggeartefakter
    # Legg til flere mappenavn her om nødvendig
    # f.eks. 'target' for Java/Maven/Rust, 'bin', 'obj' for .NET
}
# --- Slutt Konfigurasjon ---

def hent_prosjekt_innhold():
    """
    Går gjennom prosjektmappen fra der scriptet kjøres, henter innholdet
    av alle filer (unntatt de ignorerte), og skriver det til en output-fil
    med filbaner som markører.
    """
    prosjekt_rot = os.getcwd()
    output_sti = os.path.join(prosjekt_rot, OUTPUT_FILENAME)

    print(f"Scanner prosjektet i: {prosjekt_rot}")
    print(f"Ignorerer filer: {IGNORE_FILES}")
    print(f"Ignorerer mapper: {IGNORE_DIRS}")
    print(f"Skriver utdata til: {output_sti}")

    fil_teller = 0
    try:
        with open(output_sti, 'w', encoding='utf-8') as outfile:
            # Bruk topdown=True for å kunne modifisere dirnames og unngå å gå inn i ignorerte mapper
            for dirpath, dirnames, filenames in os.walk(prosjekt_rot, topdown=True):

                # Fjern ignorerte mapper fra videre traversering
                # Viktig å modifisere dirnames på plass (derfor [:] )
                dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]

                # Behandle filer i nåværende mappe
                for filename in filenames:
                    # Hopp over ignorerte filer
                    if filename in IGNORE_FILES:
                        continue

                    full_sti = os.path.join(dirpath, filename)

                    # Få relativ sti fra prosjektets rotmappe
                    try:
                        relativ_sti = os.path.relpath(full_sti, prosjekt_rot)
                    except ValueError as e:
                         # Kan skje på Windows hvis stasjonen er forskjellig (sjelden i denne konteksten)
                         print(f"Advarsel: Kunne ikke finne relativ sti for {full_sti}: {e}", file=sys.stderr)
                         continue # Hopp over denne filen


                    # Normaliser sti-separatorer til / for konsistens
                    relativ_sti = relativ_sti.replace(os.sep, '/')

                    print(f"  Legger til: {relativ_sti}")
                    fil_teller += 1

                    # Skriv filbanen som en markør
                    outfile.write(f"--- Fil: {relativ_sti} ---\n\n")

                    # Les og skriv innholdet av filen
                    try:
                        with open(full_sti, 'r', encoding='utf-8', errors='ignore') as infile:
                            innhold = infile.read()
                            outfile.write(innhold)
                        # Legg til litt luft etter filinnholdet
                        outfile.write("\n\n")
                    except Exception as e:
                        outfile.write(f"*** FEIL: Kunne ikke lese filen '{relativ_sti}'. Årsak: {e} ***\n\n")
                        print(f"Advarsel: Kunne ikke lese filen {relativ_sti}: {e}", file=sys.stderr)


        print(f"\nFullført! {fil_teller} filer ble lagt til i {OUTPUT_FILENAME}")

    except IOError as e:
        print(f"\nFEIL: Kunne ikke skrive til utdatafilen '{output_sti}'. Årsak: {e}", file=sys.stderr)
    except Exception as e:
        print(f"\nEn uventet feil oppstod: {e}", file=sys.stderr)


if __name__ == "__main__":
    # Legg til navnet på dette scriptet i ignore listen dynamisk
    # slik at det ikke inkluderer seg selv hvis det ligger i rotmappen
    script_navn = os.path.basename(__file__)
    if script_navn: # Sjekk om __file__ er definert (kan mangle i noen interaktive miljøer)
        IGNORE_FILES.add(script_navn)

    hent_prosjekt_innhold()