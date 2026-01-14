# Helper script to create folders for each receipe
# has to be run from data or testdata folder
tail -n +2 recipes.csv | cut -d ',' -f2 | xargs -i{} mkdir -p "recipe/{}"

for dir in recipe/*     # list directories in the form "/tmp/dirname/"
do
    dir=${dir%*/}      # remove the trailing "/"
    # echo "${dir##*/}"    # print everything after the final "/"
    if  [ ! -e "$dir"/ingredients.csv ] && [ ! -e "$dir"/description.txt ] && [ ! -e "$dir"/description.html ]; then
        echo "Creating base files: ${dir##*/}"

        read -p "Create Ingredients List? " -n 1 -r
        echo    # (optional) move to a new line
        if [[ $REPLY =~ ^[Yy]$ ]]
        then
            touch "$dir"/ingredients.csv
            printf  "Name,Amount" >> "$dir"/ingredients.csv
        fi

        read -p "Create Description HTML? " -n 1 -r
        echo    # (optional) move to a new line
        if [[ $REPLY =~ ^[Yy]$ ]]
        then
            touch "$dir"/description.html
        fi

    fi
done
