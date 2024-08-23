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
	console.log("All ", receipts);

	// remove all which shouldn't be included
	receipts = receipts.filter(recipe => recipe.Include === 'Y');

	console.log("Filtered ", receipts);

	// shuffle the entries around
	receipts = _.shuffle(receipts);


	// Get sub-array of first n elements after shuffled
	return receipts.slice(0, 5);
}

function transformData(data){
	return {
		name:data['Name'], 
		link: getLink(data)
	};
}

function getLink(data){
	if(data.External === 'Y'){
		return data['Link'].trim();
	}

	return "recipe.html?recipe="+data['Link'].trim()+"&name="+data['Name'].trim();
}