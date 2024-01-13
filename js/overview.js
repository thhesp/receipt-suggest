$( document ).ready(function() {
	loadRecipes();
});

function loadRecipes(){
	jQuery("#recipes-container").empty();
	jQuery.get({
        type: "GET",
        url: "data/recipes.csv",
        dataType: "text",
        success: function(data) {
        	console.log(data);
        	var recipes = jQuery.csv.toObjects(data);

					for(var i = 0; i < recipes.length; i++){
						var template = _.template($("#recipe-template").html());
						jQuery("#recipes-container").append(template(transformData(recipes[i])));
					}
        },
        error: function(xhr, ajaxOptions, thrownError) {
	  	  	console.log(xhr.status);
        	console.log(thrownError);
	  }
     });


} 

function transformData(data){
	return {
		name:data['Name'], 
		link: getLink(data)
	};
}

function getLink(data){
	if(data.External === 'Y'){
		return data['Link'];
	}

	return "recipe.html?recipe="+data['Link']+"&name="+data['Name'];
}