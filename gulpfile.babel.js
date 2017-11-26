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
	/*!BANNERSTART                                                                 \n
	|==============================================================================\n
	| Информация о дистрибутиве : <%= pkg.name %>                                  \n
	|==============================================================================\n
	|                                                                              \n
	| Версия:         <%= pkg.version %>                                           \n
	| Лицензия:       <%= pkg.license %>                                           \n
	| Описание:       <%= pkg.description %>                                       \n
	| Файл изменен:   + date +                                                     \n
	|                                                                              \n
	|------------------------------------------------------------------------------\n
	|                                                                              \n
	| Автор:    <%= pkg.author.name %>                                             \n
	| Локация:  <%= pkg.author.location %>                                         \n
	| Phone:    <%= pkg.author.phone %>                                            \n
	| Email:    <%= pkg.author.email %>                                            \n
	| Telegram: <%= pkg.author.telegram %>                                         \n
	| Skype:    <%= pkg.author.skype %>                                            \n
	|                                                                              \n
	|==============================================================================\n
	BANNEREND*/\n\n`;
	return banner;
};

var FAVICON_DATA_FILE = 'faviconData.json', // Список разположений всех генерируемых файлов - фавиконов | List of the locations of all the generated files - favicon
	configs = {},
	taskList = [cleanBase, 'favicon', templates, htmlBeautify, htmlLint, watch], // Списки рабочих режимов | Lists of operating modes
	plugins = gulpLoadPlugins({
		rename: {
			'gulp-util':               'gutil',
			'gulp-sass-lint':          'sassLint',
			'gulp-jade-find-affected': 'affected',
			'gulp-assign-to-pug':      'pugAssign',
			'gulp-real-favicon':       'realFavicon',
			'gulp-text-simple':        'textSimple',
			'gulp-html-beautify':      'htmlBeautify'
		},
		pattern: [
			'gulp-*',
			'gulp.'
		]
	}),
	faviconPaths = [],
	faviconTRW = plugins.textSimple(replaceRootTags); // Favicon template replacer wrapper

configs.assets = 'assets/';
configs.dist = 'dist/';
configs.realURL = 'https://deep.social.esy.es';
configs.favicon = {
	assets:     configs.assets  + 'images/favicon/',
	dist:       configs.dist    + 'images/favicon/',
	name:       'favicon',
	postfix:	'--prod',
	ext:        'png',
	settings: {
		scalingAlgorithm: 'Mitchell',
		errorOnImageTooSmall: false
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
		'common',
		'header',
		'main-header',
		'dwarf-menu',
		'navigation',
		'search',
		'autocomplete',
		'menu',
		'footer',
		'media-queries'
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
	exceptions: [],
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
	cached: {
		name: 'bannerCache',
		options: configs.sass.cached.options
	},
	debug: {
		title: 'Banner задействовал:'
	},
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

/*==============================================================
=            Рабочий интерфейс | Operating interface           =
==============================================================*/

gulp.task('favicon', gulp.series(faviconFile, faviconGenerate, faviconInject, faviconClean));
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

function watch() {
	// gulp.watch(configs.sassLint.SCSSConfigFile)
	// 	.on('all', (function () {
	// 		if (mode === configs.prod) {
	// 			return gulp.series(sassConfig, sassLint, sass, cssMin, banner, browser.reload);
	// 		}
	// 		return gulp.series(sassConfig, sassLint, sass, banner, browser.reload);
	// 	})());

	// gulp.watch([configs.sass.assets + '*.' + configs.sass.ext, configs.sass.assets + '/**/*.' + configs.sass.ext, configs.bootstrap.dist + '*.' + configs.bootstrap.ext])
	// 	.on('all', (function () {
	// 		if (mode === configs.prod) {
	// 			return gulp.series(sassLint, sass, cssMin, banner, browser.reload);
	// 		}
	// 		return gulp.series(sassLint, sass, banner, browser.reload);
	// 	})());

	gulp.watch(configs.templates.assets + '*.' + configs.templates.ext)
		.on('all', gulp.series(templates, htmlBeautify, htmlLint, browser.reload));
}
