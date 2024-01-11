function onGenerateSuggestions(){
	jQuery("#recipes-container").empty();
	jQuery.get({
        type: "GET",
        url: "data/recipes.csv",
        dataType: "text",
        success: function(data) {
        	console.log(data);
        	var suggestions = getSuggestions(data);

			for(var i = 0; i < suggestions.length; i++){
				var template = _.template($("#recipe-template").html());
				jQuery("#recipes-container").append(template(transformData(suggestions[i])));
			}
        },
        error: function(xhr, ajaxOptions, thrownError) {
	  	  	console.log(xhr.status);
        	console.log(thrownError);
	  }
     });


} 

function getSuggestions(csv){
	var receipts = jQuery.csv.toObjects(csv);
	console.log(receipts);

	const shuffled = receipts.sort(() => 0.5 - Math.random());

	// Get sub-array of first n elements after shuffled
	return shuffled.slice(0, 5);
}

function transformData(data){
	return {
		name:data['Name'], 
		link: "recipe.html?recipe="+data['Link']+"&name="+data['Name']
	};
}