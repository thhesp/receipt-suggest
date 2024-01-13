# receipt-suggest

Main idea was to have a "simple" website to suggest recipes to cook. Since I never have an good idea what to cook and don't want to think about it.

## Usage
You can just add (or replace) your own data in data and build the Dockerimage.


## Add your own data
### Add your entries to recipes.csv
It is pretty simple how to add you own recipes. You can add them to recipes.csv, the first part of the CSV is the name of the recipe, while the second part ist the folder where more data for this recipe can be found.

It looks like this:
|Name|Link|
|Pasta|chefkoch-nudeln-mal-anders|
|Roastbeef|chefkoch-rinderbraten|

### Subfolders for each recipe
More information can be found in the recipe subfolder. You have to create an folder for which recipe. If you are using linux, there is also an helper.sh script which will create the folders & files based on the recipes.csv (shouldn't overwrite existing data).

All infos and images are optional, if there is no data this is also fine.

#### Ingredients
You can add the ingredients again in form of an CSV file, it looks like this:

|Name|Amount|
|Bread|2 slices|
|Ham|2 slices|
|Gruyere cheese|2 slices|

It has to be named "ingredients.csv".

#### Description
You can add the description in form of an text file with the name "description.txt". This could in theory even be HTML (or javascript). So be aware not to load this from unverified sources, so nobody does shady stuff with it.

##### Images
The website will search for images with the name "img.jpg","img.png" or "img.jpeg". Afterwards it will search for "img_1.jpg", "img_2.jpg" until "img_9.jpg". So in theory you could add in up to 30 images, which I wouldn't recommend. But well.

It may be good to reduce the images size, for this there is an script which uses imagemagick (linux) to reduce image sizes.

You can also do the compression in the docker image, if you prefer that.