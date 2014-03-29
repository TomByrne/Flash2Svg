(function(ext){
	function TemplateReplacer(){

		/*var settings=new ext.Object({
			format:this.formats[0]
		});
		settings.extend(options);

		this.settings = settings;*/

		return this;
	}

	TemplateReplacer.prototype={
		__proto__:Object,
		/**
		 * @property
		 * @see extensible.Object
		 */
		type:TemplateReplacer,

		loopCommaToken:"$loopComma",
		ifToken:/$if=(\w)+$/g,
		endIfToken:"$endif",

		_baseTokens:{},
		_iterators:[],
		_iteratorLookup:{},

		addToken : function(token, value){
			this._baseTokens[token] = value;
		},

		removeToken : function(token){
			delete this._baseTokens[token];
		},

		addIterator : function(id, openToken, closeToken, dataTokens, childIterators, activateHandler, deactivateHandler){
			var iterator = {id:id, openToken:openToken, closeToken:closeToken, childIterators:childIterators, dataTokens:dataTokens, activateHandler:activateHandler, deactivateHandler:deactivateHandler, data:[]};
			this._iteratorLookup[id] = iterator;
			this._iterators.push(iterator);
		},

		setIteratorData : function(id, data){
			this._iteratorLookup[id].data.push(data);
		},

		clearIterator : function(id){
			var iterator = _iteratorLookup[id];
			iterator.data.pop();

			this._iterators.splice(this._iterators.indexOf(iterator), 1);

			delete this._iteratorLookup[id];
		},

		replace:function(text){
			return this._replace(text, 0);
		},

		_replace:function(text, fromIterator){
			var l = this._iterators.length;
			var loopWas = this._baseTokens[this.loopCommaToken];
			for(var i=fromIterator; i<l; ++i){
				var iterator = this._iterators[i];

				var openL = iterator.openToken.length;
				var closeL = iterator.closeToken.length;
				
				var openInd = -1;
				var closeInd = 0;
				while((openInd = text.indexOf(iterator.openToken, closeInd))!=-1){
					closeInd = text.indexOf(iterator.closeToken, openInd);
					if(closeInd==-1)return fl.trace("ERROR: Template error, can't find closing token for "+iterator.openToken);
					if(!iterator.data.length)return fl.trace("ERROR: Template error, token opened without data "+iterator.openToken);

					var bef = text.substring(0, openInd);
					var aft = text.substring(closeInd + closeL);
					var inner = "";

					var innerTemplate = text.substring(openInd + openL, closeInd);

					var dataList = iterator.data[iterator.data.length-1];

					for(var j=0; j<dataList.length; ++j){
						var data = dataList[j];

						for(var childId in iterator.childIterators){
							this.setIteratorData(childId, this._getProp(data, iterator.childIterators[childId]));
						}

						for(var token in iterator.dataTokens){
							this.addToken(token, this._getProp(data, iterator.dataTokens[token]));
						}

						if(iterator.activateHandler)iterator.activateHandler(data);

						this.addToken(this.loopCommaToken, j==dataList.length-1?"":",");
						inner += this._replace(innerTemplate, i+1);

						if(iterator.deactivateHandler)iterator.deactivateHandler(data);
					}

					for(var token in iterator.dataTokens){
						this.addToken(token, null);
					}

					for(var childId in iterator.childIterators){
						this.setIteratorData(childId, null);
					}

					text = bef + inner + aft;

					closeInd += closeL;
				}
			}
			this.addToken(this.loopCommaToken, loopWas);
			text = this._replaceTokens(this._baseTokens, text);
			return text;
		},

		_getProp:function(obj, prop){
			var props = prop.split(".");
			for(var i=0; i<props.length; ++i){
				var value = obj[props[i]];
				if(i<props.length-1){
					obj = value;
				}else{
					return value;
				}
			}
		},

		_replaceTokens:function(tokens, text){
			var index = -1;
			for(var i in tokens){
				while(text.indexOf(i)!=-1)text = text.replace(i, tokens[i]);
			}
			return text;
		}

	}
	ext.extend({TemplateReplacer:TemplateReplacer});
})(extensible)