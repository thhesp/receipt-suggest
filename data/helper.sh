# Helper script to create folders for each receipe
# has to be run from data or testdata folder
tail -n +2 recipes.csv | cut -d ',' -f2 | xargs -i{} mkdir -p "recipe/{}"
ls -d recipe/* | xargs -I {} bash -c "cd '{}' && touch ingredients.csv"
ls -d recipe/* | xargs -I {} bash -c "cd '{}' && touch description.txt"