﻿import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Http } from '@angular/http';
import { Viewer } from 'xbim-viewer';
import { Browser } from 'xbim-browser';
import { NavigationCube, RenderingMode } from 'xbim-viewer';
import { State } from 'xbim-viewer';
import 'jquery-ui/ui/widgets/accordion';

// xBrowser is internally dependant on jQuery being globally available
import * as $ from 'jquery';
window["$"] = $;
window["jQuery"] = $;

@Component({
    templateUrl: './model-browser.component.html',
    styleUrls: ['./model-browser.component.css']
})
export class ModelBrowserComponent implements AfterViewInit {

    constructor(private http: Http) { }

    private viewer: Viewer;
    private browser: Browser;
    private keepTarget: boolean = false;
    private _lastSelection: any;

    private loadingFile: boolean = false;

    ngAfterViewInit() {
        var self = this;
        this.initControls();
        $(window).resize(function () {
            self.reinitControls();
        });
        this.browser = new Browser();
        this.browser.on("loaded", function (args) {
            var facility = args.model.facility;
            //render parts
            self.browser.renderSpatialStructure("structure", true);
            self.browser.renderAssetTypes("assetTypes", true);
            self.browser.renderSystems("systems", null);
            self.browser.renderZones("zones", null);
            self.browser.renderContacts("contacts");
            self.browser.renderDocuments(facility[0], "facility-documents");

            //open and selectfacility node
            $("#structure > ul > li").click();
        });

        this.browser.on("entityClick", function (args) {
            var span = $(args.element).children("span.xbim-entity");
            if (self._lastSelection)
                self._lastSelection.removeClass("ui-selected");
            span.addClass("ui-selected")
            self._lastSelection = span;
        });
        this.browser.on("entityActive", function (args) {
            var isRightPanelClick = false;
            if (args.element)
                if ($(args.element).parents("#semantic-descriptive-info").length != 0)
                    isRightPanelClick = true;

            //set ID for location button
            $("#btnLocate").data("id", args.entity.id);

            self.browser.renderPropertiesAttributes(args.entity, "attrprop");
            self.browser.renderAssignments(args.entity, "assignments");
            self.browser.renderDocuments(args.entity, "documents");
            self.browser.renderIssues(args.entity, "issues");

            if (isRightPanelClick)
                $("#attrprop-header").click();

        });

        this.browser.on("entityDblclick", function (args) {
            var entity = args.entity;
            var allowedTypes = ["space", "assettype", "asset"];
            if (allowedTypes.indexOf(entity.type) === -1) return;

            var id = parseInt(entity.id);
            if (id && self.viewer) {
                self.viewer.resetStates(true);
                self.viewer.renderingMode = RenderingMode.XRAY;
                if (entity.type === "assettype") {
                    var ids = [];
                    for (var i = 0; i < entity.children.length; i++) {
                        id = parseInt(entity.children[i].id);
                        ids.push(id);
                    }
                    this.viewer.setState(State.HIGHLIGHTED, ids);
                }
                else {
                    this.viewer.setState(State.HIGHLIGHTED, [id]);
                }
                this.viewer.zoomTo(id);
                this.keepTarget = true;
            }
        });

        this.setUpViewer();
    }

    private setUpViewer() {
        var self = this;
        //alert('WebGL support is OK');
        this.viewer = new Viewer("viewer-canvas");
        this.viewer.background = [249, 249, 249, 255];
        this.viewer.on("mouseDown",
            function(args) {
                if (!self.keepTarget) self.viewer.setCameraTarget(args.id);
            });
        this.viewer.on("pick",
            function(args) {
                self.browser.activateEntity(args.id);
                self.viewer.renderingMode = RenderingMode.NORMAL;
                self.viewer.resetStates(true);
                self.keepTarget = false;
            });
        this.viewer.on("dblclick",
            function(args) {
                self.viewer.resetStates(true);
                self.viewer.renderingMode = RenderingMode.XRAY;
                var id = args.id;
                self.viewer.setState(State.HIGHLIGHTED, [id]);
                self.viewer.zoomTo(id);
                self.keepTarget = true;
            });

        this.viewer.load("/models/LakesideRestaurant.wexbim", 'modelWexbim');
        this.browser.load("/models/LakesideRestaurant.json");

        var cube = new NavigationCube();
        this.viewer.addPlugin(cube);

        var currentlySelectedElement: any;
        this.viewer.on('pick',
            (args) => {
                if (currentlySelectedElement) {
                    this.viewer.setState(State.UNSTYLED, [currentlySelectedElement]);
                }
                if (currentlySelectedElement === args.id) {
                    currentlySelectedElement = null;
                    return;
                }
                currentlySelectedElement = args.id;
                this.viewer.setState(State.HIGHLIGHTED, [args.id]);
            });

        this.viewer.start();
    }

    private initControls() {
        var self = this;
        $("#semantic-descriptive-info").accordion({
            heightStyle: "fill"
        });
        $("#semantic-model").accordion({
            heightStyle: "fill"
        });

        $("#btnLocate").button().click(function () {
            var id = $("#btnLocate").data("id");
            if (typeof (id) != "undefined" && self.viewer) {
                self.viewer.zoomTo(parseInt(id));
            }
        });

        $("#toolbar button").button();

        $("#btnClip").click(function () {
            self.viewer.clip();
        });

        $("#btnUnclip").click(function () {
            self.viewer.unclip();
        });
    }

    private reinitControls() {
        $("#semantic-model").accordion("refresh");
        $("#semantic-descriptive-info").accordion("refresh");
    }
}
