# Need imagemagick
# apt-get update && apt-get install -y imagemagick libmagickwand-dev --no-install-recommends
# also maybe you need to adapt the imagemagick policies
# They are in /etc/ImageMagick-6/policy.xml


find ./data -type f -name '*.jpg' -exec convert {} -resize 1024x -quality 50% {} \;
find ./data -type f -name '*.png' -exec convert {} -resize 1024x -quality 50% {} \;
find ./data -type f -name '*.jpeg' -exec convert {} -resize 1024x -quality 50% {} \;