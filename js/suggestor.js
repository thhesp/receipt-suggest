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
	shuffleSuggestions(receipts);

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
		return data['Link'];
	}

	return "recipe.html?recipe="+data['Link']+"&name="+data['Name'];
}

function shuffleSuggestions(array) {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1)); // random index from 0 to i

    // swap elements array[i] and array[j]
    // we use "destructuring assignment" syntax to achieve that
    // you'll find more details about that syntax in later chapters
    // same can be written as:
    // let t = array[i]; array[i] = array[j]; array[j] = t
    [array[i], array[j]] = [array[j], array[i]];
  }
}