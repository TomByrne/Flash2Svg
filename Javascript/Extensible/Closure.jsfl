(function(ext){
	function closure(scope, meth, args, passArgs){
		if(passArgs || passArgs==null){
			if(args==null)args = [];
			return function(){
				var args2 = args.concat();
				for(var i=0; i<arguments.length; ++i)args2.push(arguments[i]);
				meth.apply(scope, args2);
			};
		}else{
			return function(){
				meth.apply(scope, args);
			};
		}
	}
	ext.extend({closure:closure});
})(extensible)