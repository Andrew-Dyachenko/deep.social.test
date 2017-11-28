'use strict';

import gulp                from 'gulp';
import path                from 'path';
import gulpLoadPlugins     from 'gulp-load-plugins';
import pkg                 from './package.json';
import browser             from 'browser-sync';
import del                 from 'del';
import fs                  from 'file-system';
import makeSassLintConfig  from 'make-sass-lint-config';
import jsyaml              from 'js-yaml';
import magicImporter       from 'node-sass-magic-importer';
import nodeResolve         from 'rollup-plugin-node-resolve-auto';
import rollupPluginReplace from 'rollup-plugin-replace';
import rollupPluginAlias   from 'rollup-plugin-alias';

gulp.signature = function (date) { // Подпись. | Signature.
	const banner = `
	/*!BANNERSTART                                                                 
	|==============================================================================
	| Информация о дистрибутиве : <%= pkg.name %>                                  
	|==============================================================================
	|                                                                              
	| Версия:         <%= pkg.version %>                                           
	| Лицензия:       <%= pkg.license %>                                           
	| Описание:       <%= pkg.description %>                                       
	| Файл изменен:   ${date}                                                 
	|                                                                              
	|------------------------------------------------------------------------------
	|                                                                              
	| Автор:    <%= pkg.author.name %>                                             
	| Локация:  <%= pkg.author.location %>                                         
	| Phone:    <%= pkg.author.phone %>                                            
	| Email:    <%= pkg.author.email %>                                            
	| Telegram: <%= pkg.author.telegram %>                                         
	| Skype:    <%= pkg.author.skype %>                                            
	|                                                                              
	|==============================================================================
	BANNEREND*/\n\n`;
	return banner;
};

var mode = 'dev',
	FAVICON_DATA_FILE = 'faviconData.json', // Список разположений всех генерируемых файлов - фавиконов | List of the locations of all the generated files - favicon
	configs = {},
	taskList = [cleanBase, 'favicon', templates, htmlBeautify, htmlLint, 'sassGroup', 'jsGroup', /*banner, */'copy', server, watch, faviconUpdate], // Списки рабочих режимов | Lists of operating modes
	fastList = [cleanBase, templates, htmlBeautify, htmlLint, 'sassGroup', 'jsGroup', /*banner, */'copy', server, watch],
	plugins = gulpLoadPlugins({
		rename: {
			'gulp-uglify-es':          'uglify',
			'gulp-util':               'gutil',
			'gulp-sass-lint':          'sassLint',
			'gulp-jade-find-affected': 'affected',
			'gulp-assign-to-pug':      'pugAssign',
			'gulp-real-favicon':       'realFavicon',
			'gulp-text-simple':        'textSimple',
			'gulp-html-beautify':      'htmlBeautify',
			'sass-multi-inheritance':  'sassMultiInheritance'
		},
		pattern: [
			'gulp-*',
			'gulp.'
		]
	}),
	faviconPaths = [],
	faviconTRW = plugins.textSimple(replaceRootTags); // Favicon template replacer wrapper

configs.prod = 'prod';
configs.dev = 'dev';
configs.assets = 'assets/';
configs.dist = 'dist/';
configs.realURL = 'https://deep.social.esy.es';
configs.favicon = {
	assets:     configs.assets  + 'images/favicon/',
	dist:       configs.dist    + 'images/favicon/',
	name:       'favicon',
	postfix:	'--dev',
	ext:        'png',
	settings: {
		scalingAlgorithm: 'Mitchell',
		errorOnImageTooSmall: false
	}
};

configs.server    = {
	// proxy: configs.localURL,
	open: false,
	reloadOnRestart: true,
	notify: true,
	localOnly: false,
	https: false,
	startPath: '/pages',
	browser: [
		'google chrome',
		'firefox',
		'safari',
		'opera',
		'internet explorer'
	],
	server: {
		baseDir: './',
		directory: true
	}
};

configs.favicon.design = {
	ios: {
		pictureAspect: 'noChange',
		assets: {
			ios6AndPriorIcons: true,
			ios7AndLaterIcons: true,
			precomposedIcons: true,
			declareOnlyDefaultIcon: true
		}
	},
	desktopBrowser: {},
	windows: {
		pictureAspect: 'noChange',
		backgroundColor: '#ffffff',
		onConflict: 'override',
		assets: {
			windows80Ie10Tile: false,
			windows10Ie11EdgeTiles: {
				small: false,
				medium: true,
				big: false,
				rectangle: false
			}
		}
	},
	androidChrome: {
		pictureAspect: 'noChange',
		themeColor: '#ffffff',
		manifest: {
			name: 'Deep social',
			startUrl: configs.realURL,
			display: 'standalone',
			orientation: 'notSet',
			onConflict: 'override',
			declared: true
		},
		assets: {
			legacyIcon: false,
			lowResolutionIcons: false
		}
	},
	safariPinnedTab: {
		pictureAspect: 'silhouette',
		themeColor: '#f3f5f7'
	}
};

configs.sass = {
	assets: configs.assets  + 'sass/',
	dist:   configs.dist    + 'css/',
	ext:    's+(a|c)ss',
	files: [
		'bundle'
	],
	exceptions: [],
	options: {
		indentType:     'tab',
		indentWidth:    1,
		outputStyle:    'expanded',
		importer:       magicImporter()
	},
	mapPath: '/',
	autoprefixer: {
		browsers: [
			'> 11%',
			'Chrome >= 10',
			'Explorer >= 6',
			'Opera >= 9',
			'Firefox >= 3.5',
			'Safari >= 4',
			'iOS >= 6'
		],
		remove: true
	},
	debug: {
		title: 'Sass задействовал:'
	},
	cached: {
		name: 'sassCache',
		options: {
			optimizeMemory: true
		}
	}
};

configs.sassLint = {
	assets:     configs.sass.assets,
	ext:        configs.sass.ext,
	exceptions: [
		'configs/**',
		'functions/**'
	],
	SCSSConfigFile: '.scss-lint.yml',
	SASSConfigFile: '.sass-lint.yml',
	debug: {
		title: 'Sass lint задействовал:'
	},
	cached: {
		name: 'sassLintCache',
		options: configs.sass.cached.options
	}
};

configs.js = {
	assets: configs.assets  + 'js/',
	dist: configs.dist      + 'js/',
	ext: 'js',
	cached: {
		name: 'jsCache',
		options: {
			optimizeMemory: true
		}
	},
	exceptions: []
};

configs.js.jsbeautify = {
	assets:     configs.js.assets,
	dist:       configs.js.dist,
	ext:        configs.js.ext,
	exceptions: [],
	options: {
		indentSize: 4,
		indentChar: '\t',
		endWithNewline: true
	},
	debug: {
		title: 'jsBeautify задействовал:'
	}
};

configs.js.fixmyjs = {
	assets:     configs.js.dist,
	dist:       configs.js.dist,
	ext:        configs.js.ext,
	exceptions: [],
	options: {
		config: '.jshintrc'
	},
	debug: {
		title: 'fixmyJS задействовал:'
	}
};

configs.js.semi = {
	assets:     configs.js.dist,
	dist:       configs.js.dist,
	ext:        configs.js.ext,
	exceptions: [],
	options: {},
	debug: {
		title: 'SemiJS задействовал:'
	}
};

configs.js.uglify = {
	assets:       configs.js.dist,
	dist:         configs.js.dist,
	ext:          configs.js.ext,
	exceptions:   [/*'!*.min.js'*/],
	renameSuffix: '.min',
	options: {
		output: {
			comments: /jshint\s+esversion:\s+\d+(?:'use\sstrict';)?/ // ~~~~~> /*jshint esversion: 6 */
		}
	},
	debug: {
		title: 'uglify JS задействовал:'
	}
};

configs.js.jshint = {
	assets: configs.js.assets,
	dist: configs.js.dist,
	ext: configs.js.ext,
	exceptions: []
};

configs.js.rollup = {
	cached: {
		name: 'jsRollup',
		options: {
			optimizeMemory: true
		}
	},
	debug: {
		title: 'rollupJS задействовал:'
	}
};

configs.banner = {
	js: {
		assets: configs.js.dist,
		dist: configs.js.dist,
		ext: configs.js.ext,
		exceptions: [],
		debug: {
			title: 'Bnr.js задействовал:'
		}
	},
	css: {
		assets: configs.sass.dist,
		dist: configs.sass.dist,
		ext: 'css',
		exceptions: [],
		debug: {
			title: 'Bnr.css задействовал:'
		}
	},
	cached: {
		name: 'bannerCache',
		options: configs.sass.cached.options
	},
	debug: {
		title: 'Banner задействовал:'
	}
};

configs.templates = {
	assets: configs.assets + 'templates/',
	ext:    'pug',
	dist:   'pages/',
	options: {
		pretty: '\t',
		locals:     {
			name:           pkg.name,
			author:         pkg.author,
			description:    pkg.description,
			keywords:       pkg.keywords,
			revisit:        pkg.revisit,
			cssDist:        configs.sass.dist,
			jsDist:         configs.js.dist,
		}
	}
};

configs.html = {
	assets: configs.templates.dist,
	dist: configs.templates.dist,
	ext: 'html',
	beautify: {
		debug: {
			title: 'HTML Beautify задействовал:'
		},
		exceptions: [
			'favicon.html'
		],
		options: {
			indent_size: 4,
			indent_char: '\t',
			indent_with_tabs: true,
			// eol: '\n',
			end_with_newline: true,
			// indent_level: 0,
			// preserve_newlines: true,
			max_preserve_newlines: 1,
			// space_in_paren: false,
			// space_in_empty_paren: false,
			// jslint_happy: false,
			// space_after_anon_function: false,
			brace_style: 'expand',
			// space_in_paren: false,
			// space_in_empty_paren: false,
			// unindent_chained_methods: false,
			// break_chained_methods: false,
			// keep_array_indentation: false,
			// unescape_strings: false,
			// wrap_line_length: 0,
			// e4x: false,
			// comma_first: false,
			// operator_position: 'before-newline'
		}
	},
	lint: {
		exceptions: [
			'!favicon.html'
		],
		debug: {
			title: 'HTML Lint задействовал:'
		},
		options: {
			rules: { // https://github.com/htmllint/htmllint/wiki/Options
				'class-style': 'bem',
				'id-class-style': 'bem',
				'line-end-style': false,
				'attr-name-style': false,
				'attr-req-value': false,
				// 'space-tab-mixed-disabled': false
			}
		}
	},
	cached: {
		name: 'htmlCache',
		options: {
			optimizeMemory: true
		}
	}
};

configs.favicon.injectFile = {
	assets: configs.templates.assets,
	name:   configs.favicon.name,
	ext:    configs.templates.ext,
	dist:   configs.templates.assets
};

configs.images = {
	assets: configs.assets  + 'images/',
	dist:   configs.dist    + 'images/',
	ext:    [
		'png',
		'jpg',
		'svg,'
	],
	cached: {
		name: 'images',
		options: {
			optimizeMemory: true
		}
	}
};

configs.images.copy = {};
configs.images.copy.ext = '**';
configs.images.copy.exceptions = [];

/*==============================================================
=            Рабочий интерфейс | Operating interface           =
==============================================================*/

gulp.task('sassGroup', (function () {
	sassGlobalWatch();
	return gulp.series(sassConfig, sassLint, sass);
})());

gulp.task('jsGroup', (function () {
	return gulp.series(jshint, rollupJS, fixmyJS, semiJS, jsbeautify, uglify);
})());

gulp.task('copy',
	gulp.series(copyImages/*, copyJS*/));

gulp.task('favicon', gulp.series(faviconFile, faviconGenerate, faviconInject, faviconClean));

gulp.task('fast', gulp.series(fastList));

gulp.task('default', gulp.series(taskList));

/*============================================================*/

function srcCollection(ext, exceptions, regexp) {
	var array = [];
	if (Array.isArray(ext)) {
		ext.forEach(function (element) {
			array.push(regexp + element);
		});
	}
	else {
		array.push(regexp + ext);
	}
	if (exceptions.length) {
		var concated = array.concat(exceptions);
		console.log(concated);
		return concated;
	}
	console.log(array);
	return array;
}

function clean(array) { // Обертка для очистки. | Clean wrapper.
	return del(array, {
		dryRun: true,
		force: true
	}).then(paths => {
		console.log('Удалены следующие файлы и папки | Deleted files and folders:\n', paths.join('\n'));
	});
}

function cleanBase() { // Удаление вновь генерируемых фалов и папок. | Removing regenerable files and folders
	return clean([configs.dist, configs.templates.assets + configs.favicon.injectFile.name + '.' + configs.templates.ext]);
}

function replaceRootTags(string) { // Excess tags clean wrapper 
	return string.replace(/(?:<\/?(?:html|head|body)>)/igm, '');
}

function faviconFile() { // Генератор файла фавикона. | Favicon file generator.
	var str = '';
	return plugins.file(configs.favicon.injectFile.name + '.' + configs.templates.ext, str, {
		src: true
	})
		.pipe(gulp.dest(configs.favicon.injectFile.dist));
}

function faviconGenerate(done) { // Генератор фавиконов | Favicon generator
	console.log('Используем: ' + configs.favicon.assets + configs.favicon.name + configs.favicon.postfix + '.' + configs.favicon.ext);
	plugins.realFavicon.generateFavicon({
		masterPicture: configs.favicon.assets + configs.favicon.name + configs.favicon.postfix + '.' + configs.favicon.ext,
		dest: configs.favicon.assets,
		iconsPath: '/../' + configs.favicon.dist,
		design: configs.favicon.design,
		settings: configs.favicon.settings,
		markupFile: FAVICON_DATA_FILE
	}, function () {
		done();
		clean(faviconPaths);
	});
}

function faviconInject() { // HTML Инжектор фавиконов - Favicons html injector
	return gulp
		.src([configs.favicon.injectFile.assets + configs.favicon.injectFile.name + '.' + configs.templates.ext])
		.pipe(plugins.realFavicon.injectFaviconMarkups(JSON.parse(fs.readFileSync(FAVICON_DATA_FILE)).favicon.html_code))
		.pipe(gulp.dest(configs.templates.assets));
}

function faviconUpdate() { // Проверка обновлений для плагина | Check for updates on RealFaviconGenerator
	var currentVersion = JSON.parse(fs.readFileSync(FAVICON_DATA_FILE)).version;
	plugins.realFavicon.checkForUpdates(currentVersion, function (err) {
		if (err) {
			throw err;
		}
	});
}
/* jshint ignore:start */

function faviconClean() {
	return gulp
		.src(configs.favicon.injectFile.assets + configs.favicon.injectFile.name + '.' + configs.favicon.injectFile.ext)
		.pipe(faviconTRW())
		.pipe(gulp.dest(configs.templates.assets));
}

function templates() { // Шаблоны. | Templates.
	return gulp
		.src([
			'*.' + configs.templates.ext,
			'!' + configs.favicon.injectFile.name + '.' + configs.favicon.injectFile.ext
		], {
			cwd: configs.templates.assets
		})
		.pipe(plugins.affected())
		.pipe(plugins.pug(configs.templates.options))
		.pipe(gulp.dest(configs.templates.dist));
}

function htmlBeautify() {
	return gulp
		.src([configs.html.assets + '*.' + configs.html.ext, '!' + configs.html.assets + '*.' + configs.html.beautify.exceptions])
		.pipe(plugins.debug(configs.html.beautify.debug))
		.pipe(plugins.htmlBeautify(configs.html.beautify.options))
		.pipe(gulp.dest(configs.html.dist));
}

function htmlLint() {
	return gulp
		.src((srcCollection)(configs.html.ext, configs.html.lint.exceptions, '*.'), {
			cwd: configs.html.dist
		})
		.pipe(plugins.newer('../' + configs.html.dist))
		.pipe(plugins.debug(configs.html.lint.debug))
		.pipe(plugins.htmllint(configs.html.lint.options, htmllintReporter));
}

function htmllintReporter(filepath, issues) {
	if (issues.length > 0) {
		issues.forEach(function (issue) {
			plugins.gutil.log(plugins.gutil.colors.cyan('[gulp-htmllint] ') + plugins.gutil.colors.white(filepath + ' [' + issue.line + ',' + issue.column + ']: ') + plugins.gutil.colors.red('(' + issue.code + ') ' + issue.msg));
		});

		process.exitCode = 1;
	}
}

function sassGlobalWatch() {
	global.isWatching = true;
}

function sassSRC(mode) {
	var arr = [];
	if (mode === 'sass' && configs[mode].files.length) {
		configs[mode].files.forEach(function (element) {
			arr.push(configs[mode].assets + element + '*.' + configs[mode].ext);
		});
	}
	else {
		arr = [
			configs[mode].assets + '*.' + configs[mode].ext,
			configs[mode].assets + '**/' + '*.' + configs[mode].ext
		];
	}
	if (configs[mode].exceptions.length) {
		var concated = [];
		configs[mode].exceptions.forEach(function (element) {
			concated.push('!' + configs[mode].assets + element);
			concated.push('!' + configs[mode].assets + '**/' + element);
		});
		concated = arr.concat(concated);
		console.log('CONCATED ' + mode + ': ', concated);
		return concated;
	}
	return arr;
}

function sassLint() {
	return gulp
		.src((function () {
			return sassSRC('sassLint');
		})())
		.pipe(plugins.cached(configs.sassLint.cached.name, configs.sassLint.cached.options))
		.pipe(plugins.debug(configs.sassLint.debug))
		.pipe(plugins.sassLint({
			configFile: configs.sassLint.SASSConfigFile
		}))
		.pipe(plugins.sassLint.format())
		.pipe(plugins.sassLint.failOnError());
}

function sass() {
	return gulp
		.src((function () {
			return sassSRC('sass');
		})())
		// .pipe(plugins.if(global.isWatching, plugins.cached(configs.sass.cached.name, configs.sass.cached.options)))
		// .pipe(plugins.cached(configs.sass.cached.name, configs.sass.cached.options))
		.pipe(plugins.sassMultiInheritance({dir: configs.sass.assets}))
		.pipe(plugins.debug(configs.sass.debug))
		.pipe(plugins.sourcemaps.init())
		.pipe(plugins.sass(configs.sass.options).on('error', plugins.sass.logError))
		.pipe(plugins.autoprefixer(configs.sass.autoprefixer))
		.pipe(plugins.sourcemaps.write(configs.sass.mapPath))
		.pipe(gulp.dest(configs.sass.dist));
}

function sassConfig() {
	var scssLintConfigYaml = fs.readFileSync(configs.sassLint.SCSSConfigFile, 'utf8'),
		scssLintConfig = jsyaml.safeLoad(scssLintConfigYaml);

	makeSassLintConfig.convert(scssLintConfig);
	var string = makeSassLintConfig.convertYaml(scssLintConfigYaml);    // Convert a YAML file and get YAML output

	return plugins.file(configs.sassLint.SASSConfigFile, string, { src: true }).pipe(gulp.dest('./'));
}

function jsbeautify() {
	return gulp
		.src((srcCollection)(configs.js.jsbeautify.ext, configs.js.jsbeautify.exceptions, '*.'), {
			cwd: configs.js.jsbeautify.dist
		})
		.pipe(plugins.newer('../' + configs.js.jsbeautify.dist))
		.pipe(plugins.debug(configs.js.jsbeautify.debug))
		.pipe(plugins.jsbeautify(configs.js.jsbeautify.options))
		.pipe(gulp.dest(configs.js.jsbeautify.dist));
}

function fixmyJS() {
	return gulp
		.src((srcCollection)(configs.js.fixmyjs.ext, configs.js.fixmyjs.exceptions, '*.'), {
			cwd: configs.js.fixmyjs.assets
		})
		.pipe(plugins.newer('../' + configs.js.fixmyjs.dist))
		.pipe(plugins.debug(configs.js.fixmyjs.debug))
		.pipe(plugins.if(mode === configs.prod, plugins.fixmyjs(configs.js.fixmyjs.options)))
		.pipe(gulp.dest(configs.js.fixmyjs.dist));
}

function semiJS() {
	return gulp
		.src((srcCollection)(configs.js.semi.ext, configs.js.semi.exceptions, '*.'), {
			cwd: configs.js.semi.assets
		})
		.pipe(plugins.newer('../' + configs.js.semi.dist))
		.pipe(plugins.debug(configs.js.semi.debug))
		.pipe(plugins.semi.add(configs.js.semi.options))
		.pipe(gulp.dest(configs.js.semi.dist));
}

function rollupJS() {
	return gulp
		.src((function(){
			var arr = [];
			(srcCollection)(configs.js.ext, configs.js.exceptions, '*.').forEach(function (element) {
				arr.push(configs.js.assets + element);
			});
			return arr;
		})())
		.pipe(plugins.cached(configs.js.rollup.cached.name, configs.js.rollup.cached.options))
		.pipe(plugins.debug(configs.js.rollup.debug))
		.pipe(plugins.sourcemaps.init())
		.pipe(plugins.rollup({
			// any option supported by Rollup can be set here. 
			allowRealFiles: true,
			input: ['assets/js/bundle.js'],
			banner: '/*jshint esversion: 6*/',
			format: 'es',
			plugins: [
				rollupPluginReplace({
					'process.env.NODE_ENV': JSON.stringify(mode === configs.prod ? 'production' : 'development')
				}),
				nodeResolve({
					// If you set this to true, then modules will be built in "browser" mode 
					// based on the presence of the "browser" field in package.json 
					browser: false,  // Default: false 

					// not all files you want to resolve are .js or .json files 
					// if you want to support .json, you'll also need rollup-plugin-json 
					extensions: ['.js', '.json']  // Default: ['.js'] 
				})
			]
		}))
		.pipe(plugins.sourcemaps.write('/'))
		.pipe(gulp.dest(configs.js.dist));
}

function uglify() {
	var ugf = gulp;
	ugf.src((srcCollection)(configs.js.uglify.ext, configs.js.uglify.exceptions, '*.'), {
			cwd: configs.js.uglify.assets
		})
		.pipe(plugins.newer('../' + configs.js.uglify.dist))
		.pipe(plugins.debug(configs.js.uglify.debug))
		.pipe(plugins.if(mode === 'prod',
			plugins.uglify.default(configs.js.uglify.options),
		))
		.pipe(plugins.if(mode === 'prod',
			plugins.rename({
				suffix: configs.js.uglify.renameSuffix
			})
		))
		.pipe(gulp.dest(configs.js.uglify.dist));

	return Promise.all([ugf]);
}

function jshint() {
	return gulp
		.src((srcCollection)(configs.js.jshint.ext, configs.js.jshint.exceptions, '*.'), {
			cwd: configs.js.jshint.assets
		})
		.pipe(plugins.newer('../' + configs.js.jshint.dist))
		.pipe(plugins.jshint())
		.pipe(plugins.jshint.reporter('default'));
}

function copyImages() {
	var src = configs.images.copy.exceptions;
	src.unshift(configs.images.assets + configs.images.copy.ext);
	return gulp
		.src(src)
		.pipe(plugins.cached(configs.images.cached.name, configs.images.cached.options))
		.pipe(gulp.dest(configs.images.dist));
}

function banner() {
	var css = gulp
		.src((srcCollection)(configs.banner.css.ext, configs.banner.css.exceptions, '*.'), {
			cwd: configs.banner.css.dist
		})
		.pipe(plugins.newer('../' + configs.banner.css.dist))
		.pipe(plugins.debug(configs.banner.css.debug))
		.pipe(plugins.banner((gulp.signature)(Date()), { pkg: pkg }))
		.pipe(gulp.dest(configs.banner.css.dist));

	var js = gulp
		.src((srcCollection)(configs.banner.js.ext, configs.banner.js.exceptions, '*.'), {
			cwd: configs.banner.js.dist
		})
		.pipe(plugins.cached(configs.banner.cached.name, configs.banner.cached.options))
		.pipe(plugins.debug(configs.banner.js.debug))
		.pipe(plugins.banner((gulp.signature)(Date()), { pkg: pkg }))
		.pipe(gulp.dest(configs.banner.js.dist));

	return Promise.all([js, css]);
}

function server(done) {
	browser.init((function () {
		var options = configs.server;
		options.localOnly = (function () {
			return mode === configs.prod;
		})();
		console.log(options);
		return options;
	})());
	done();
}

function watch() {
	var extImages = (function () {
		var obj = '{';
		configs.images.ext.forEach(function (element, index, array) {
			obj += element;
			if (index < array.length - 1) {
				obj += ',';
			}
		});
		obj += '}';
		obj = obj.replace(',}', '}');
		console.log(obj, obj.replace(',svg', ''));
		return obj;
	})();

	gulp.watch(configs.sassLint.SCSSConfigFile)
		.on('all', (function () {
			if (mode === configs.prod) {
				return gulp.series(sassConfig, sassLint, sass, cssMin, banner, browser.reload);
			}
			return gulp.series(sassConfig, sassLint, sass, banner, browser.reload);
		})());

	gulp.watch([configs.sass.assets + '*.' + configs.sass.ext, configs.sass.assets + '/**/*.' + configs.sass.ext])
		.on('all', (function () {
			if (mode === configs.prod) {
				return gulp.series(sassLint, sass, cssMin, banner, browser.reload);
			}
			return gulp.series(sassLint, sass, banner, browser.reload);
		})());

	gulp.watch(configs.js.assets + '*.' + configs.js.ext)
		.on('all', gulp.series('jsGroup', banner, browser.reload));

	gulp.watch(configs.templates.assets + '*.' + configs.templates.ext)
		.on('all', gulp.series(templates, htmlBeautify, htmlLint, browser.reload));

	gulp.watch([configs.images.assets + '*.' + extImages])
		.on('all', gulp.series(copyImages, browser.reload));
}
