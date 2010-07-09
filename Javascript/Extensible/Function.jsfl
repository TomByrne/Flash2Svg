(function(ext){
	/**
	 * @param {Object} context The object to be represented by [this] within the function.
	 * @args {Array} Argument list.
	 * @tries {Number} The number of times to attempt the function.
	 * @bThrowError {Boolean} If true, an error will be thrown if the maximum tries are reached without success.
	 */
	Function.prototype.attempt=function(context,args,tries,bThrowError){
		var result,e;
		args=args||[];
		tries=tries||1;
		if(bThrowError==undefined){
			bThrowError=false;	
		}
		for(var i=0;i<tries;i++){
			try{
				result=this.apply(context,args);
				break;
			}catch(e){}
		}
		if(result==undefined && e!==undefined){
			if(this.log){
				this.log.append(message);
			}
			if(bThrowError){
				throw e;
			}else if(this.warnings){
				fl.trace(e);
			}
		}
		return result;
	}
})(extensible)
