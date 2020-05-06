const Q = require('q');


const NewProject = {
    id: '',
    title: 'auto test project',
    description: 'project.description',
    level: 10,
    onduty: '0900',
    offduty: '1800',
};

const UpdateProject = {
    id: '',
    title: 'test project',
    description: 'project.description',
    level: 4,
    onduty: '1200',
    offduty: '2000',
};

function PreClean() {
    return new Promise((rsl, rej)=>{
        Q.all([
            MongoDB.Project.remove({title: NewProject.title}),
            MongoDB.Project.remove({title: UpdateProject.title})
        ]).then(
            result=>{
                rsl();
            }
        )
    });
}

function ProjectAdd(req) {

    return new Promise((rsl,rej)=>{
        var projectAdd = Include('/api/project/add');
        projectAdd.Do(req, NewProject, (code, message, result)=>{
            assert(code == ErrorCode.Code.OK);
            assert(message == ErrorCode.Message.OK);
            rsl();
        });
    });
}

function ProjectInfo(req) {
    return new Promise((rsl, rej)=>{
        req = NewObj(req);
        req.body={
            titlereg: NewProject.title
        };
        var projectInfo = Include('/api/project/info');
        projectInfo.Do(req, function (code, msg, res) {
            assert(code == ErrorCode.Code.OK);
            assert(res.title == NewProject.title);
            NewProject.id = res.id;
            UpdateProject.id = res.id;
            rsl();
        });
    });
}

function ProjectUpdate(req) {
    return new Promise((rsl, rej)=>{
        req = NewObj(req);
        req.body=UpdateProject;
        var projectUpdate = Include('/api/project/update');
        projectUpdate.Do(req, function (code, msg, res) {
            assert(code == ErrorCode.Code.OK);
            rsl();
        });
    });
}

function ProjectDelete(req) {
    return new Promise((rsl, rej)=>{
        req = NewObj(req);
        req.body=UpdateProject;
        var projectDelete = Include('/api/project/delete');
        projectDelete.Do(req, function (code, msg, res) {
            assert(code == ErrorCode.Code.OK);
            MongoDB.Project.findOne({_id: UpdateProject.id})
                .exec((err, prj)=>{
                    assert(err == null);
                    assert(prj == null);
                    rsl();
                });
        });
    });
}

exports = module.exports = (req)=>{
    //
    PreClean(req)
        .then(
            ()=>{
                return ProjectAdd(req);
            }
        )
        .then(
            ()=>{
                return ProjectInfo(req);
            }
        )
        .then(
            ()=>{
                return ProjectUpdate(req);
            }
        )
        .then(
            ()=>{
                return ProjectDelete(req);
            }
        ).then(
            ()=>{
                log.info('Project Test OK...');
                PreClean();
            }
        );
};