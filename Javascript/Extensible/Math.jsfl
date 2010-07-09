(function(ext){
	Math.roundTo=function(number,decimalPlaces){
		var multiplier=Math.pow(10,decimalPlaces);
		return Math.round(number*multiplier)/multiplier;
	};
})(extensible)
