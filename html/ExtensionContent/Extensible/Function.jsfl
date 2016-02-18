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
			}catch(e){
				result=e;
			}
		}
		if(result==undefined && e!==undefined){
			if(this.log){
				this.log.append(message);
			}
			if(bThrowError){
				throw e;
			}else{
				ext.warn(e);
			}
		}
		return result;
	}

	if (!Function.prototype.bind) {
	  Function.prototype.bind = function (oThis) {
	    if (typeof this !== "function") {
	      // closest thing possible to the ECMAScript 5 internal IsCallable function
	      throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
	    }

	    var aArgs = Array.prototype.slice.call(arguments, 1),
	      fToBind = this,
	      fNOP = function () {},
	      fBound = function () {
	        return fToBind.apply(this instanceof fNOP && oThis? this : oThis, aArgs.concat(Array.prototype.slice.call(arguments)));
	      };

	    fNOP.prototype = this.prototype;
	    fBound.prototype = new fNOP();

	    return fBound;
	  };
	}
	
})(extensible)
