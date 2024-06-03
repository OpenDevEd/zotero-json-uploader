openalex-cli search --title-abs "'climate change' AND buildings" --page 1 --save openalex_10
scholarly-cli --search "'climate change' 'school buildings'" --limit 10 --fill --save scholarly-filled_10
scholarly-cli --search "'climate change' 'school buildings'" --limit 10 --save scholarly_10
scopus-cli search "'climate change' AND buildings" --limit 10 --save scopus_10
# scopus-cli search "'climate change' AND buildings" --limit 10 --keyType Institutional --view COMPLETE --save scopus-inst_10
scite-cli search "'climate change' AND buildings" --limit --save scite_10
