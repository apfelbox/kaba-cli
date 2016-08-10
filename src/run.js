"use strict";

const chalk = require("chalk");
const tildify = require("tildify");
const prettyTime = require("pretty-time");
const path = require("path");


var timers = {};


/**
 *
 * @param {LiftoffEnvironment} env
 * @param argv
 */
module.exports = function (env, argv)
{
    const VERBOSE = argv.v;
    const DEBUG = !!argv.debug || !!argv.dev || !!argv.d;

    console.log("");
    console.log("  " + chalk.black(chalk.bgYellow("  ~~~~~~  ")));
    console.log("  " + chalk.black(chalk.bgYellow("   kaba   ")));
    console.log("  " + chalk.black(chalk.bgYellow("  ~~~~~~  ")));
    console.log("");

    // check for local kaba installation
    if (!env.modulePath)
    {
        console.log(
            chalk.red("Local kaba not found in "),
            tildify(env.cwd)
        );
        process.exit(1);
    }

    // if no config file, return with an error
    if (!env.configPath)
    {
        console.log(chalk.red("No kabafile found."));
        process.exit(1);
    }

    // print path to the used kaba file
    printUsedKabaFile(env);
    console.log("");

    // set current dir to the dir of the kabafile
    process.chdir(env.cwd);

    // get kaba instance
    let kaba = require(env.modulePath);

    kaba.on("start", (taskDetails) => timers[taskDetails.id] = process.hrtime());
    kaba.on("end", (taskDetails) => {
        if (timers[taskDetails.id])
        {
            let diff = process.hrtime(timers[taskDetails.id]);
            console.log("Task " + chalk.yellow(taskDetails.task) + " finished after " + chalk.blue(prettyTime(diff)));
            delete timers[taskDetails.id];
        }
    });


    try
    {
        // run kabafile
        require(env.configPath);
    }
    catch (e)
    {
        let message = e instanceof Error ? e.message : e;
        printUsage(kaba, `The loaded kaba file has thrown an error: ${message}`);

        // rethrow error, if verbose mode is set
        if (VERBOSE)
        {
            throw e;
        }

        return;
    }

    // get selected task name
    let selectedTaskName;
    switch (argv._.length)
    {
        // if no task name is given, use the default task name
        case 0:
            selectedTaskName = kaba.DEFAULT_TASK_NAME;
            break;

        case 1:
            selectedTaskName = argv._[0];
            break;

        // if more than one task is given: abort
        default:
            printUsage(kaba, "Please select a single task.");
            return;
    }

    let selectedTask = kaba.task(selectedTaskName);

    if (!selectedTask)
    {
        if (kaba.DEFAULT_TASK_NAME !== selectedTaskName)
        {
            printUsage(kaba, "The task " + chalk.yellow(selectedTaskName) + " is not registered.");
        }
        else
        {
            printUsage(kaba, "No default task registered.");
        }
    }
    else
    {
        try
        {
            var noop = () => {};
            selectedTask(noop, DEBUG);
        }
        catch (e)
        {
            let message = e instanceof Error ? e.message : e;
            console.log(chalk.red(`The task has thrown an error: ${message}`));

            if (VERBOSE)
            {
                throw e;
            }
        }
    }
};


/**
 * Prints the path to the used kaba file
 *
 * @param {LiftoffEnvironment} env
 */
function printUsedKabaFile (env)
{
    let kabaFilePath = path.relative(process.cwd(), env.configPath);

    // if it is a relative path in one of the parent directories
    if (0 === kabaFilePath.indexOf(".."))
    {
        kabaFilePath = tildify(env.configPath);
    }

    console.log(chalk.blue("Using kabafile: ") + kabaFilePath);
}


/**
 * Prints the usage information with an additional, optional error message
 *
 * @param {Kaba} kaba
 * @param {string|null} message
 */
function printUsage (kaba, message = null)
{
    const tasks = kaba ? kaba.listTasks() : [];

    if (tasks.length)
    {
        console.log("Registered tasks:");

        tasks.forEach(
            function (taskName)
            {
                let formattedTaskName = (kaba.DEFAULT_TASK_NAME === taskName) ?
                    chalk.yellow.bold("default task") + " (run without parameter)" :
                    chalk.yellow(taskName);
                console.log(`    - ${formattedTaskName}`);
            }
        );
    }
    else
    {
        console.log("No tasks defined");
    }

    console.log("");

    if (message)
    {
        console.log(chalk.red(message));
    }

    console.log("Please run a task with: " + chalk.cyan("kaba task"));
}
