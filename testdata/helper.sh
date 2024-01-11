# Helper script to create folders for each receipe
# has to be run from data or testdata folder
tail -n +2 receipes.csv | cut -d ',' -f2 | xargs -i{} mkdir -p "receipe/{}"