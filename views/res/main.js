//TEMPORY SAVES
var all_safe = [];



//CODE HANDLING;
function code(json) {

    var code = json.code;
    switch (code) {
        case 100:
            console.log('Success');
            break;
        case 500:
            alert('Logged in as GUEST');
            break;
        case 600:
            alert('Error connecting to database');
            break;
        case 1001:
            console.log('Success at love route. Database updated. Reflect changes on DOM');
            break;
        case 1002:
            console.log('The Image not found!');
            alert('Image not found');
            break;
        case 1003:
            alert('You have already liked this!');
            break;

    }
}


var app = angular.module('myApp', []);
app.controller('ctrl', ['$scope', '$rootScope', function ($scope, $rootScope) {
    $scope.test = function () {
        alert('Angular Test');
    }
    $scope.loadAll = function () {

        $.getJSON('/all', function (json) {
            $scope.$apply(function () {
                $scope.all = json.all;
                all_safe = json.all;
            });
            console.log($scope);
        });
    }

    $scope.loadMyPins = function () {
        $.getJSON('/myPins', function (json) {
            console.log(json);
            code(json);
            $scope.$apply(function () {
                $scope.myPins = json.pins;
                all_safe = json.pins;
            });
        });
    }
    $scope.delete = function (id) {
        $.getJSON('/delete?id=' + id, function (json) {
            code(json);

            //ERROR HANDLING!!!
            $scope.$apply(function () {
                $scope.myPins = json.pins;
                all_safe = json.pins;
            });
            var $grid = $('.grid').masonry({
                itemSelector: '.grid-item',
                percentPosition: true,
                columnWidth: '.grid-sizer'
            });
            $grid.masonry('reloadItems');
            setTimeout(function () {
                if ($('.search_field').val()) {
                    console.log('FILLED WITH ' + $('.search_field').val());
                    $('.search_btn').trigger('click');
                } else {
                    console.log('EMPTY');
                }
            });
        });
    }
    $scope.open = function (url) {
        window.open(url, '_self');
    }
    $scope.loadPeep = function (id) {
        console.log(`id from loadPeep : ${id}`);
        $.getJSON('/loadPeep?id=' + id, function (json) {
            code(json);
            if (json.code == 100) {
                $scope.$apply(function () {
                    $scope.peeps = json.peeps;
                    all_safe = json.peeps;
                    $scope.name = json.name;
                    $scope.profile_pic = json.profile_pic;
                });
            }
        });
    }
}]);

app.directive('pin', function () {
    return {
        restrict: "EA",
        scope: false,
        link: function (scope, elem) {
            scope.blur = function () {
                elem.find($('img')).css('opacity', 0.5);
            }
            scope.bright = function () {
                elem.find($('img')).css('opacity', 1);
            }
            scope.beat = function () {
                elem.find($('.fa-heart')).addClass('animated pulse');
            }
            scope.love = function (id) {
                var pin_scope = angular.element('.grid').scope();
                //console.log(id);
                $.getJSON('/love?id=' + id, function (json) {
                    console.log(`code: ${json.code}`);
                    code(json);
                    if (json.code == 1001) {
                        scope.beat();
                        scope.item.love++;
                        scope.$apply();
                    }
                });
            }
            //console.log(scope);
            if (scope.$last) {
                console.log('last');
                //console.log(scope);
                var $grid = $('.grid').masonry({
                    itemSelector: '.grid-item',
                    percentPosition: true,
                    columnWidth: '.grid-sizer'
                });
                // layout Masonry after each image loads
                $grid.imagesLoaded().progress(function () {
                    //debugger;
                    $grid.masonry();
                });
            }
            scope.peep = function () {
                console.log(scope.item.ownerId);
                window.open(`/peep?id=${scope.item.ownerId}`, '_self');
            }
            var url = `http://graph.facebook.com/${scope.item.ownerId}/picture?type=square`;
            //console.log();
            elem.find($('.profile')).css('background-image', `url(${url})`);
            //console.log(scope);
        }
    }
});

app.directive('fallback', function () {
    return {
        link: function (scope, elem, iattr) {
            elem.bind('error', function () {
                console.log('FALLBACK');
                elem.attr('src', 'https://pbs.twimg.com/profile_images/600060188872155136/st4Sp6Aw.jpg');

                var $grid = $('.grid').masonry({
                    itemSelector: '.grid-item',
                    percentPosition: true,
                    columnWidth: '.grid-sizer'
                });
                // layout Masonry after each image loads
                $grid.imagesLoaded().progress(function () {
                    $grid.masonry();
                });
            });
        }
    }
});

$(function () {

    setTimeout(function () {
        if ($('.search_field').val()) {
            console.log('FILLED WITH ' + $('.search_field').val());
            $('.search_btn').trigger('click');
        } else {
            console.log('EMPTY');
        }
    }, 500);

    function search() {
        var query = $('.search_field').val();
        var scope = angular.element('#container').scope();

        function loadGrid() {
            console.log('GRID LOADER');
            var $grid = $('.grid').masonry({
                itemSelector: '.grid-item',
                percentPosition: true,
                columnWidth: '.grid-sizer'
            });
            $grid.masonry('reloadItems');
        }

        function searchQ() {
            var ret = [];
            all_safe.forEach(function (item) {
                var description = item.description;
                if (description) {
                    description = description.toLowerCase();
                    if (description.indexOf(query.toLowerCase()) >= 0) {
                        ret.push(item);
                    }
                }

            });
            scope.$apply(function () {
                if (scope.all) {
                    scope.all = ret;
                }
                if (scope.peeps) {
                    scope.peeps = ret;
                }
                if (scope.myPins) {
                    scope.myPins = ret;
                }
            });

            loadGrid();
            loadGrid();
        }
        searchQ();
    }

    $('.addimage').bind('paste', function () {
        setTimeout(function () {
            $('.prev').attr({
                src: $('.addimage').val()
            });
            $('.preview').css('display', 'block');
        });
        //alert($('.addimage').val());
    });
    $('.addimage').on("change paste keyup", function () {
        setTimeout(function () {
            $('.prev').attr({
                src: $('.addimage').val()
            });
            $('.preview').css('display', 'block');
            if ($('.addimage').val() == '') {
                $('.preview').css('display', 'none');
            }
        });

    });

    $('.addBtn').click(function () {
        var url = $('.addimage').val().toString();
        var description = $('#description').val();
        console.log(description);
        $.getJSON(`/add?url=${url}&description=${description}`, function (json) {
            // alert('success');
            $('.preview').css('display', 'none');
            var scope = angular.element("#container").scope();
            if (json.code == 100) {
                if (scope.all) {
                    scope.all.push({
                        url: url,
                        love: 0,
                        id: json.id,
                        ownerId: json.ownerId,
                        description: json.description
                    });
                    scope.$apply();
                    var $grid = $('.grid').masonry({
                        itemSelector: '.grid-item',
                        percentPosition: true,
                        columnWidth: '.grid-sizer'
                    });
                    $grid.masonry('reloadItems');
                } else {
                    scope.myPins.push({
                        url: url,
                        love: 0,
                        id: json.id,
                        ownerId: json.ownerId,
                        description: json.description
                    });
                    scope.$apply();
                    var $grid = $('.grid').masonry({
                        itemSelector: '.grid-item',
                        percentPosition: true,
                        columnWidth: '.grid-sizer'
                    });
                    $grid.masonry('reloadItems');
                }
            }
            if (json.code == 500) {
                alert('Please login first to add pins');
            }
            if (json.code == 600) {
                alert('Error connecting to the database');
            }
            // layout Masonry after each image loads

            console.log(json.status);
        });
    });

    $('.search_btn').click(function () {
        search();
    });
    $('.search_field').on('change paste keyup', function () {
        search();
    });

});
