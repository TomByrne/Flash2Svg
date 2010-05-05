(function(){
	function ExtensibleObject(obj){
		if(obj){
			var empty=(obj && obj.type)?new obj.type():{};
			for(var i in obj){
				if(
					!obj.__lookupGetter__(i)&&
					empty[i]===undefined
				){
					if(obj[i] && !obj[i].type){
						switch(obj[i].constructor.name){
							case 'Array':
								this[i]=new dx.Array(obj[i]);
								break;
							case 'Object':
								this[i]=new this.type(obj[i]);
								break;
							default:
								this[i]=obj[i];
						}
					}else{
						this[i]=obj[i];
					}
				}
			}
		}
		return this;
	}
	ExtensibleObject.prototype={
		__proto__:Object.prototype,
		type:ExtensibleObject,
		each:function(iterator,context,args){
			var empty=new this.type();
			context=context || this;
			args=args||[];
			for(k in this){
				if(
					!empty.__lookupGetter__(k) &&
					empty[k]===undefined
				){
					var a=args;
					a.splice(0,0,this[k],k);
					iterator.apply(context,a);
				}	
			}
			return all;
		},
		get all(){
			var all={};
			var empty=new this.type();
			for(k in this){
				if(
					!empty.__lookupGetter__(k) &&
					empty[k]===undefined
				){
					all[k]=this[k];
				}	
			}
			return all;
		},
		set all(obj){
			if(obj){
				var keys=this.keys;
				var unset=new dx.Array();
				for(var i in obj){
					if(!obj.__lookupGetter__(i)){
						unset.push(i);
						this[i]=obj[i];
					}
				}
				this.clear(unset);
			}	
		},
		get keys(){
			var keys=new dx.Array();
			var empty=new this.type();
			for(k in this){
				if(
					!empty.__lookupGetter__(k) &&
					empty[k]===undefined
				){
					keys.push(k);
				}
			}
			return keys;
		},
		clear:function(keys){
			keys=keys||this.keys;
			for(var i=0;i<keys.length;i++){
				delete this[keys[i]];
			}
		},
		extend:function(obj,recursive){
			if(typeof(obj)!='object'){return;}
			obj=obj.all || obj;
			for(var n in obj){
				if(
					recursive && 
					typeof(this[n])==typeof(obj[n])
				){
					if(this[n].constructor.name=='Object'){
						this[n]=new dx.Object(this[n]);
					}else if(this[n].constructor.name=='Array'){
						this[n]=new dx.Array(this[n]);
					}
					if(this[n].extend instanceof Function){
						this[n].extend(obj[n],recursive);
					}else{
						this[n]=obj[n];
					}
				}else{
					this[n]=obj[n];	
				}
			}
		},
		remove:function(r){
			if(typeof(r)!='array'){return;}
			for(var i=0;i<r.length;i++){
				if(this[r[i]]){
					delete this[r[i]];
				}	
			}
		},
		uniqueKey:function(k){
			if(typeof(k)!='string'){return;}
			if(this[k]!==undefined){
				if(/\_[\d]*?$/.test(k)){
					return this.uniqueKey(k.replace(/[\d]*?$/,String(Number(/[\d]*?$/.exec(k)[0])+1)));
				}else{
					return  this.uniqueKey(k+"_1");
				}
			}
			return k;
		},
		is:function(o,options){
			if(typeof(o)!='object'){return;}
			if(!(o instanceof this.type)){
				o=new dx.Object(o);	
			}
			var settings=new dx.Object({
				ignore:null,//list of attributes to ignore, defaults to none
				checklist:null//list of attributes to check, defaults to all
			});
			settings.extend(options);
			if(settings.ignore && !(settings.ignore instanceof dx.Array)){
				settings.ignore=new dx.Array(settings.ignore)
			}
			if(settings.checklist && !(settings.checklist instanceof dx.Array)){
				settings.checklist=new dx.Array(settings.checklist)
			}
			var keys=settings.checklist||o.keys;
			for(var i=0;i<keys.length;i++){
				var k=keys[i];
				if(
					(!settings.ignore || settings.ignore.indexOf(k)<0) && (
						!(o[k] instanceof Function) && (
							(Boolean(o[k]) != Boolean(this[k])) || (
								this[k]!=o[k] && 
								!(this[k]['is'] && this[k].is(o[k]))
							)
						)
					)
				){
					return false;
				}
			}
			return true;
		}
	}
	dx.extend({Object:ExtensibleObject});
})()