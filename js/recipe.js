$( document ).ready(function() {
	getRecipeInfo();
});


function getRecipeInfo(){
	const searchParams = new URLSearchParams(window.location.search);
	document.title=searchParams.get('name');
	jQuery('#recipe-name').text(searchParams.get('name'));

	var recipeFolder = "data/recipe/"+searchParams.get('recipe')+"/";
	findImages(recipeFolder);
	loadIngredients(recipeFolder);
	loadDescription(recipeFolder);
}

function loadIngredients(recipeFolder){
	jQuery.get({
        type: "GET",
        url: recipeFolder+"ingredients.csv",
        dataType: "text",
        success: function(data) {
        	var ingredients = jQuery.csv.toObjects(data);
			for(var i = 0; i < ingredients.length; i++){
				var template = _.template($("#ingredients-template").html());
				jQuery("#ingredients-table tbody").append(template(ingredients[i]));
			}
        },
        error: function(xhr, ajaxOptions, thrownError) {
	  	  	console.log(xhr.status);
        	console.log(thrownError);
	  }
     });
}

function findImages(recipeFolder){
	var images = [];
	var fileextension = [".png", ".jpg", ".jpeg"];

	for(var extension in fileextension){
		for(var i = 0; i < 10; i++){
			var file = recipeFolder+"img_" + i + fileextension[extension];
			if(i == 0){
				file = recipeFolder+"img" + fileextension[extension];
			}

			if(fileExists(file)){
				images.push(file);
			} else {
				break;
			}
		}
	}

	if(images.length > 0 ){
		for(var i=0; i < images.length; i++){
			$("#images-container").append( "<img src='"+images[i]+"'>" );
		}
	}

}


function loadDescription(recipeFolder){
	jQuery.get({
        type: "GET",
        url: recipeFolder+"description.txt",
        dataType: "text",
        success: function(data) {
			jQuery("#description-container").append(data);
        },
        error: function(xhr, ajaxOptions, thrownError) {
	  	  	console.log(xhr.status);
        	console.log(thrownError);
	  }
     });
}

function fileExists(url) {
    if(url){
        var req = new XMLHttpRequest();
        req.open('GET', url, false);
        req.send();
        return req.status==200;
    } else {
        return false;
    }
}