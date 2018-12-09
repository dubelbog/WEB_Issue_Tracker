class App {

    constructor(tag) {
        this.projectCollection = [];
        this.localStorageKey = "projects";
        //if no clientId set and store new clientId
        if(!localStorage.getItem("clientId")) {
            localStorage.setItem("clientId", this.guid());
        }
        this.clientId = localStorage.getItem("clientId");
        if(tag) {
            this.riotjs_tag = tag;
        }
        this.fetch();
        this.fetchAPI();
    }

    add(pname) {
        var newProject = {"client_id": this.clientId, "title": pname, "active": true};
        var elem = this;
        $.ajax({
            method: "POST",
            url: "http://zhaw-issue-tracker-api.herokuapp.com/api/projects",
            data: JSON.stringify(newProject),
            contentType: "application/json",
            dataType: "json",
            success: function(response) {
                elem.projectCollection.unshift(new Project(pname, response.id));
                elem.riotjs_tag.update();
                elem.save();
                console.log("New project with id " + response.id + " created.");
            }
        })
    }

    save() {
        localStorage.setItem(this.localStorageKey, JSON.stringify(this.projectCollection));
    }

    fetch() {
        this.projectCollection = JSON.parse(localStorage.getItem(this.localStorageKey)) || [];
        this.riotjs_tag.update();
    }

    fetchAPI(){
        var that = this;
        var activeProject = this.getActiveProject();
        var numberOfProjects = this.projectCollection.length;
        var numberOfFetchedProjects = 0;

        this.unselectAll();
        this.projectCollection.forEach(function(project){
            var url = "http://zhaw-issue-tracker-api.herokuapp.com/api/projects/" + project.pid + "/issues";
            $.ajax({
                method: "GET",
                url: url,
                success: function(issues) {
                    if(issues.length !== 0){
                        that.select(project.pid);
                        var existingLocalIssues = that.getActiveProject().todoCollection;
                        issues.forEach(function(issue){
                            var addIssueLocally = true;
                            var issueToAddLocally;

                            if(typeof existingLocalIssues !== 'undefined' && existingLocalIssues.length !== 0){
                                for(var i = 0; i<existingLocalIssues.length; i++){
                                    if(existingLocalIssues[i].id == issue.id){
                                    addIssueLocally = false;
                                    }
                                }
                            }
                            if(addIssueLocally){
                                console.log("adding issue " + issue.id + " to localStorage");
                                // reformatting date if added via webinterface of api (just cutting the first 10 characters to get date in format of 2017-12-31)
                                that.addTodo({
                                 "id" : issue.id,
                                 "name" : issue.title,
                                 "priority" : issue.priority,
                                 "date" : issue.due_date.slice(0,10),
                                 "updated_at": issue.updated_at.slice(0,-5),
                                 "done": issue.done });
                            }
                        })
                    }
                },
                complete: function(data, status){
                    numberOfFetchedProjects++;
                    if(numberOfProjects == numberOfFetchedProjects)
                    {
                        that.unselectAll();
                        that.select(activeProject.pid);
                    }
                }
            })
        })
    }

    unselectAll(){
        this.projectCollection.forEach(function(el){
            el.active = false;
        })
    }

    select(pid) {
        this.projectCollection.find(function(el) {
            if(el.pid === pid) {
                    el.active = !el.active;
            } else {
                el.active = false;
            }
        });
        this.save();
        this.riotjs_tag.update();
    }

    getActiveProject() {
        var activeElement = false;
        this.projectCollection.forEach(function(el) {
            if(el.active) {
                activeElement = el;
           }
        });
        return activeElement;
    }

    addTodo(todo) {
        if(this.getActiveProject()) {
            this.getActiveProject().todoCollection.unshift(todo);
            this.riotjs_tag.update();
        }
    }

    addTodoAPI(todo){
        var that = this;
        var thisProjectID = this.getActiveProject().pid;
            var postTodo = {
                "done": todo.done,
                "title": todo.name,
                "project_client_id": "empty",
                "priority": todo.priority,
                "client_id": this.clientId,
                "due_date": todo.date,
                "project_id": thisProjectID
            }
            var postUrl = "http://zhaw-issue-tracker-api.herokuapp.com/api/projects/" + thisProjectID + "/issues"

            $.ajax({
                method: "POST",
                url: postUrl,
                data: JSON.stringify(postTodo),
                contentType: "application/json",
                dataType: "json",
                success: function(response) {
                    console.log("new todo with id " + response.id + " created in project " + thisProjectID);
                    todo.id = response.id;
                    that.addTodo(todo);
                }
            })

    }

    deleteTodo(id) {
        var that = this;
        var cur = this.getActiveProject().todoCollection;
        var todoID;
        cur.find(function(el, index) {
            if(typeof el !== "undefined" && el.id === id) {
                todoID = el.id;
                that.getActiveProject().todoCollection.splice(index, 1);
                that.deleteTodoAPI(todoID);
                that.riotjs_tag.update();
            }
        });
    }

    deleteTodoAPI(todoID){
        var projectID = this.getActiveProject().pid;
        var deleteUrl = "http://zhaw-issue-tracker-api.herokuapp.com/api/projects/" + projectID + "/issues/" + todoID;
        $.ajax({
            method: "DELETE",
            url: deleteUrl,
            success: function(response) {
                console.log("Todo " + todoID + " from project " + projectID + " deleted successfully")
                }
            })
    }

    toggle(id) {

        var that = this;
        this.getActiveProject().todoCollection.find(function(el) {
            if(el.id === id) {
                el.done = !el.done;
                that.toggleTodoAPI(el);
                that.riotjs_tag.update();
            }
        });

    }

    toggleTodoAPI(el){
        var clientId = this.clientId;
        var activeProject = this.getActiveProject().pid;
        var todo = {
                "id": el.id,
                "done": el.done,
                "due_date": el.date,
                "title": el.name,
                "project_client_id": "empty",
                "priority": "" + el.priority,
                "client_id": clientId,
                "project_id": activeProject
        }
        var postUrl = "http://zhaw-issue-tracker-api.herokuapp.com/api/projects/" + activeProject + "/issues/" + todo.id;
        $.ajax({
            method: "PUT",
            url: postUrl,
            data: JSON.stringify(todo),
            contentType: "application/json",
            dataType: "json",
            success: function(response) {
                console.log("todo " + todo.id + " successfully toggled")
            }
        })
    }

    guid() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    }
}
