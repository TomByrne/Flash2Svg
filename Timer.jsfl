(function(ext){
	/**
	 * A hacked replacement for setTimeout / Timer.
	 * @constructor
	 */
	function Timer(options){
		var settings=new ext.Object({
			delay:0,
			repeat:0,
			callback:undefined,
			args:undefined
		});
		settings.extend(options);
		if(
			this.arguments && 
			!(this.args instanceof ext.Array)
		){
			this.args=new ext.Array(args);	
		}
		this.bridge=new BridgeTalk();
		ext.Object.apply(this,[settings]);
		return this;
	}
	Timer.prototype={
		__proto__:ext.Object.prototype,
		type:Timer,
		start:function(callback,delay,repeat,args){
			if(callback instanceof Function){
				this.callback=callback;
			}
			if(typeof(delay)=='number'){
				this.delay=delay;
			}
			if(typeof(repeat)=='number'){
				this.repeat=repeat;
			}
			if(args){
				this.args=args;	
			}
			BridgeTalk.window=window;
			this.bridge.body=(
				'('+this.interop.toSource()+')('+
					this.callback.toSource()+','+
					String(this.delay)+','+
					String(this.repeat)+
					(
						this.args?
						','+this.args.toSource(3):
						''
					)+
				')'
			);
			this.bridge.target='flash';
			this.bridge.send(
				this.delay,
				'flash'
			);
			return this;
		},
		interop:function(callback,delay,repeat,args){
			var now=Number(new Date());
			var goal=now+delay;
			while(now<goal){
				now=Number(new Date());
			}
			var loadGlobals=function(){
				for(var n in BridgeTalk.window){ 
					this[n]=BridgeTalk.window[n];
				}
			}
			var bridge=new BridgeTalk();
			bridge.body=(
				'('+loadGlobals.toSource()+')();'+
				'('+callback.toSource()+')('+
				(
					args?
					args.toSource(3).slice(1,-1):
					''
				)+
				')'
			);
			bridge.target='flash';
			if(repeat){
				try{
					bridge.send(delay,'flash');
				}catch(e){}
				return arguments.callee(callback,delay,repeat-1);
			}else{
				return bridge.send(delay,'flash');
			}
		}
	};
	ext.extend({Timer:Timer});
})(extensible)

function setTimeout(callback,delay){
	return(
		new extensible.Timer({
			callback:callback,
			delay:delay,
			args:Array.prototype.slice.call(arguments,2)
		})
	).start();
}	
